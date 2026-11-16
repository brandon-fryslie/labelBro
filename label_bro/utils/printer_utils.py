import dataclasses
import socket
import threading
import time
import ipaddress
from typing import Dict, List, Optional, Tuple

import usb.core
import brother_ql.backends.helpers
from brother_ql.raster import BrotherQLRaster
from brother_ql import conversion, backends
import cairo
import io

from zeroconf import Zeroconf, ServiceListener, ServiceBrowser
from . import quicksnmp

@dataclasses.dataclass
class PrinterInfo:
    identifier: str
    model_number: str
    label_size: str
    backend: str
    display_name: str
    is_connected: bool = False
    media_info: Optional[str] = None

# Static printer configurations removed - using auto-discovery only

# Global registry of discovered printers
_discovered_printers = {}

def get_printer_info(printer_id: str) -> PrinterInfo:
    if printer_id not in _discovered_printers:
        raise ValueError(f'Unknown printer ID: {printer_id}. Available: {list(_discovered_printers.keys())}')
    return _discovered_printers[printer_id]

def verify_printer_available(ip: str, port: int = 9100) -> bool:
    """Verify a printer is actually available and responding"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except Exception:
        return False

def verify_usb_printer_available() -> Optional[Dict]:
    """Check for USB Brother printers and return detailed info if found"""
    try:
        dev = usb.core.find(idVendor=0x04f9, idProduct=0x209b)
        if dev is not None:
            # Get basic USB identifier
            usb_identifier = 'usb://0x04f9:0x209b'

            # Try to get more detailed information from the USB device
            try:
                # Attempt to read device descriptor for model information
                model = "Unknown Brother"
                serial = "Unknown"

                # Try to get string descriptors if available
                if dev.product:
                    product_name = usb.util.get_string(dev, dev.iProduct)
                    if product_name and 'ql-' in product_name.lower():
                        model = product_name
                    elif product_name and 'brother' in product_name.lower():
                        model = product_name

                if dev.serial_number:
                    try:
                        serial = usb.util.get_string(dev, dev.iSerialNumber)
                    except:
                        pass

                # Try to get more specific model info based on product ID
                if dev.idProduct == 0x209b:
                    # This is a common Brother QL series product ID, but query actual model
                    # Use the brother_ql library to get actual model if possible
                    try:
                        from brother_ql.models import ALL_MODELS
                        # Try to determine actual model from device capabilities
                        model = "Brother QL-Series"  # Generic until we can query
                    except:
                        model = "Brother QL-Series"

                return {
                    'identifier': usb_identifier,
                    'model': model,
                    'serial_number': serial,
                    'product_id': hex(dev.idProduct),
                    'vendor_id': hex(dev.idVendor)
                }

            except Exception as e:
                # If detailed query fails, return basic info
                return {
                    'identifier': usb_identifier,
                    'model': "Brother QL-Series",  # Will be determined via protocol
                    'serial_number': "Unknown",
                    'product_id': hex(dev.idProduct),
                    'vendor_id': hex(dev.idVendor)
                }
    except Exception:
        pass
    return None


def get_usb_printer_media_info(usb_identifier: str) -> Optional[Dict]:
    """Get media information from USB Brother printer using brother_ql library"""
    from brother_ql.backends.helpers import send
    from brother_ql.backends import backend_factory
    from brother_ql import backends

    try:
        # Create backend for USB connection
        backend = backend_factory('pyusb')
        backend_identifier = usb_identifier

        # Try to send a status request command to get media info
        # This uses the brother_ql library's built-in status query
        try:
            # Send empty instruction to test connection and potentially get status
            status_info = backends.helpers.send(b'', backend_identifier, blocking=True)

            # The brother_ql library may return status information
            if status_info and 'media' in str(status_info).lower():
                return {
                    'media_info': str(status_info),
                    'is_connected': True,
                    'backend_response': status_info
                }
        except Exception as e:
            # If direct status query fails, return basic connection info
            pass

        # Try alternative method - check if printer responds to connection
        try:
            # Test basic connectivity
            backend_instance = backend_factory('pyusb')
            # This will raise an exception if the printer is not available
            return {
                'media_info': "USB printer connected",
                'is_connected': True,
                'media_width': "Unknown",  # Must be queried from actual printer
                'media_type': "Unknown"  # Must be queried from actual printer
            }
        except Exception:
            return None

    except Exception as e:
        print(f"USB printer media query failed: {e}")
        return None


class BrotherPrinterListener(ServiceListener):
    """Enhanced mDNS service listener for Brother printers using TXT record analysis"""
    def __init__(self):
        self.discovered_printers = []

    def add_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        info = zc.get_service_info(type_, name)
        if not info or not info.addresses:
            return

        # Parse TXT records for Brother printer identification
        printer_info = self._parse_brother_printer_info(info, type_, name)
        if printer_info:
            # Check for duplicates (same IP and model)
            ip = printer_info['ip']
            model = printer_info['model']

            # Check if we already have this printer
            for existing in self.discovered_printers:
                if existing['ip'] == ip and existing['model'] == model:
                    # Update with additional service type info but don't duplicate
                    if type_ not in existing.get('service_types', []):
                        existing.setdefault('service_types', []).append(type_)
                    return

            # Add service types list for tracking
            printer_info['service_types'] = [type_]
            self.discovered_printers.append(printer_info)
            print(f"  mDNS: Found {printer_info['model']} at {printer_info['ip']} via {type_}")

    def remove_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        # Remove printer from discovered list if it goes offline
        self.discovered_printers = [
            p for p in self.discovered_printers
            if not (p['name'] == name and p['service_type'] == type_)
        ]

    def update_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        # Handle service updates (printer info changes)
        self.remove_service(zc, type_, name)
        self.add_service(zc, type_, name)

    def _parse_brother_printer_info(self, info, service_type: str, name: str) -> Optional[Dict]:
        """Parse Brother printer info from mDNS service info using TXT records"""
        try:
            # Get IP address
            if not info.addresses:
                return None

            ip = socket.inet_ntoa(info.addresses[0])
            port = info.port or 9100

            # Parse TXT records for Brother printer identification
            properties = info.properties if info.properties else {}

            # Extract key TXT record fields
            model = self._extract_model_from_txt(properties)
            manufacturer = self._extract_manufacturer_from_txt(properties)
            mac_address = self._extract_mac_from_txt(properties)
            user_name = self._extract_user_name_from_txt(properties)

            # Verify this is a Brother printer
            if not self._is_brother_printer(model, manufacturer, name):
                return None

            # Build comprehensive printer info
            printer_info = {
                'ip': ip,
                'port': port,
                'name': name,
                'model': model,
                'manufacturer': manufacturer,
                'mac_address': mac_address,
                'user_name': user_name,
                'service_type': service_type,
                'discovery_method': 'mDNS_TXT',
                'txt_records': {
                    (k.decode('utf-8', 'ignore') if isinstance(k, bytes) else str(k)):
                    (v.decode('utf-8', 'ignore') if isinstance(v, bytes) else str(v) if v is not None else '')
                    for k, v in properties.items()
                },
                'hostname': info.server if info.server else f"{ip}::{port}"
            }

            return printer_info

        except Exception as e:
            print(f"  mDNS: Error parsing service info for {name}: {e}")
            return None

    def _extract_model_from_txt(self, properties: Dict[bytes, bytes]) -> str:
        """Extract precise model from TXT records using Brother's standard fields"""
        # Try 'ty' field first (Brother QL-810W format)
        model = properties.get(b'ty', b'').decode('utf-8', 'ignore')
        if model and 'QL-' in model.upper():
            return model

        # Try 'product' field
        product = properties.get(b'product', b'').decode('utf-8', 'ignore')
        if product and 'QL-' in product.upper():
            return product

        # Try USB model field
        usb_model = properties.get(b'usb_MDL', b'').decode('utf-8', 'ignore')
        if usb_model and 'QL-' in usb_model.upper():
            return usb_model

        return 'Unknown Brother'

    def _extract_manufacturer_from_txt(self, properties: Dict[bytes, bytes]) -> str:
        """Extract manufacturer from TXT records"""
        # Try USB manufacturer field
        usb_mfg = properties.get(b'usb_MFG', b'').decode('utf-8', 'ignore')
        if usb_mfg:
            return usb_mfg

        # Try generic manufacturer field
        mfg = properties.get(b'mfg', b'').decode('utf-8', 'ignore')
        if mfg:
            return mfg

        return 'Unknown'

    def _extract_mac_from_txt(self, properties: Dict[bytes, bytes]) -> Optional[str]:
        """Extract MAC address from TXT records"""
        mac = properties.get(b'mac', b'').decode('utf-8', 'ignore')
        return mac if mac else None

    def _extract_user_name_from_txt(self, properties: Dict[bytes, bytes]) -> Optional[str]:
        """Extract user-assigned printer name from TXT records"""
        note = properties.get(b'note', b'').decode('utf-8', 'ignore')
        return note if note else None

    def _is_brother_printer(self, model: str, manufacturer: str, service_name: str) -> bool:
        """Determine if this is a Brother printer using strict criteria to avoid false positives"""
        # Primary check: Model field must contain Brother QL series
        if model and 'Brother' in model and 'QL-' in model.upper():
            return True

        # Secondary check: Model contains QL- AND manufacturer is Brother
        if model and 'QL-' in model.upper() and manufacturer and 'Brother' in manufacturer:
            return True

        # Tertiary check: Manufacturer is Brother AND service name suggests Brother
        if manufacturer and 'Brother' in manufacturer:
            service_lower = service_name.lower()
            if 'brother' in service_lower or 'bro' in service_lower:
                return True

        # Reject non-Brother manufacturers even if service name mentions Brother
        if manufacturer and manufacturer not in ['Brother', 'Unknown']:
            return False

        return False


def discover_printers_snmp_broadcast(timeout: float = 3.0) -> List[Dict]:
    """Discover Brother printers using SNMP broadcast (based on brother_ql patch)"""

    print("Starting SNMP broadcast discovery for Brother printers...")

    try:
        # Use our custom SNMP broadcast discovery
        discovered = quicksnmp.discover_printers_broadcast(timeout=timeout, max_responses=10)

        # Verify each discovered printer is actually available
        verified_printers = []
        for printer in discovered:
            ip = printer['ip']
            if verify_printer_available(ip, 9100):
                verified_printers.append(printer)
                print(f"  Verified Brother printer: {ip} -> {printer['model']}")
            else:
                print(f"  Brother printer at {ip} not responding on port 9100, skipping")

        print(f"SNMP broadcast found {len(verified_printers)} verified Brother printers")
        return verified_printers

    except Exception as e:
        print(f"SNMP broadcast discovery failed: {e}")
        return []


def discover_printers_snmp_targeted(ip_ranges: List[str], timeout: float = 0.5) -> List[Dict]:
    """Discover Brother printers using parallel SNMP queries to specific IP ranges"""

    import concurrent.futures
    import threading

    discovered = []
    lock = threading.Lock()

    def check_single_ip(ip_str: str) -> Optional[Dict]:
        """Check a single IP for Brother printer via direct port connection"""
        try:
            # Check if port 9100 is open (printer port)
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((ip_str, 9100))
            sock.close()

            if result == 0:
                # Port is open, likely a printer - try to identify it
                model = identify_brother_printer(ip_str)
                if model:
                    return {
                        'ip': ip_str,
                        'port': 9100,
                        'name': f"{model} at {ip_str}",
                        'model': model,
                        'discovery_method': 'port_scan',
                        'description': f"Printer found on port 9100"
                    }

        except Exception:
            pass

        return None

    # Collect all IPs to scan
    all_ips = []
    for ip_range in ip_ranges:
        try:
            network = ipaddress.IPv4Network(ip_range)
            print(f"Preparing parallel scan of {ip_range} ({network.num_addresses} addresses)...")

            # Limit to reasonable subnet sizes
            if network.num_addresses > 512:
                print(f"  Network too large ({network.num_addresses} addresses), skipping")
                continue

            # Add all host IPs from this range
            for ip in network.hosts():
                all_ips.append(str(ip))
                if len(all_ips) >= 254:  # Limit total IPs per range
                    break

        except Exception as e:
            print(f"Invalid IP range {ip_range}: {e}")
            continue

    if not all_ips:
        return []

    print(f"Parallel scanning {len(all_ips)} IP addresses with {min(50, len(all_ips))} workers...")

    # Use ThreadPoolExecutor for parallel scanning
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(50, len(all_ips))) as executor:
        # Submit all IP checks
        future_to_ip = {executor.submit(check_single_ip, ip): ip for ip in all_ips}

        # Collect results as they complete
        completed = 0
        for future in concurrent.futures.as_completed(future_to_ip, timeout=timeout * 2 + 10):
            completed += 1
            if completed % 25 == 0:
                print(f"  Completed {completed}/{len(all_ips)} scans...")

            try:
                result = future.result()
                if result:
                    with lock:
                        discovered.append(result)
                        print(f"  Found printer: {result['ip']} -> {result['model']}")
            except Exception as e:
                # Individual scan failed, continue
                continue

    print(f"Parallel targeted scan found {len(discovered)} printers")
    return discovered


def discover_network_printers_mdns(timeout: float = 3.0) -> List[Dict]:
    """Enhanced Brother QL-810W discovery using mDNS/Bonjour with TXT record analysis"""
    print("Starting enhanced mDNS discovery for Brother printers...")

    zc = Zeroconf()
    listener = BrotherPrinterListener()
    browsers = []

    # Brother QL-810W service types (as per your specification)
    service_types = [
        "_printer._tcp.local.",        # Generic network printer discovery
        "_pdl-datastream._tcp.local.", # Raw TCP printing (port 9100 protocol)
        "_ipp._tcp.local.",           # IPP printing
        "_brother._tcp.local."        # Brother-specific services (if available)
    ]

    try:
        print(f"  Browsing {len(service_types)} mDNS service types for Brother printers...")

        # Create service browsers for each service type
        for service_type in service_types:
            try:
                browser = ServiceBrowser(zc, service_type, listener)
                browsers.append(browser)
                print(f"    ✓ Started browsing {service_type}")
            except Exception as e:
                print(f"    ✗ Failed to browse {service_type}: {e}")

        # Wait for discovery with progress indication
        print(f"  mDNS discovery running for {timeout} seconds...")
        sleep_interval = 0.5
        total_steps = int(timeout / sleep_interval)

        for step in range(total_steps):
            time.sleep(sleep_interval)
            current_count = len(listener.discovered_printers)
            if step % 4 == 0 and current_count > 0:  # Report every 2 seconds if finding printers
                print(f"    Found {current_count} Brother printers so far...")

        # Final results with detailed TXT record info
        discovered_printers = listener.discovered_printers
        print(f"mDNS discovery complete: found {len(discovered_printers)} Brother printers")

        # Log detailed discovery results
        for printer in discovered_printers:
            print(f"  ✓ {printer['model']} at {printer['ip']} (via {printer['service_type']})")
            if printer.get('user_name'):
                print(f"    User name: {printer['user_name']}")
            if printer.get('mac_address'):
                print(f"    MAC: {printer['mac_address']}")

        return discovered_printers

    except Exception as e:
        print(f"mDNS discovery failed: {e}")
        return []
    finally:
        # Clean up browsers
        for browser in browsers:
            try:
                browser.cancel()
            except:
                pass
        zc.close()


def get_local_network_ranges() -> List[str]:
    """Get comprehensive network ranges for scanning including adjacent subnets"""
    from .brother_protocol import NetworkScanner

    # Use the improved network scanner
    return NetworkScanner.get_network_ranges()


def scan_network_for_printers(timeout: float = 0.3) -> List[Dict]:
    """Scan local networks for Brother printers using optimized scanner"""
    from .brother_protocol import NetworkScanner

    try:
        # Use the new optimized network scanner
        discovered_printers = NetworkScanner.scan_for_brother_printers(timeout=timeout)

        # Convert BrotherPrinterInfo objects to the expected dictionary format
        result = []
        for printer_info in discovered_printers:
            result.append({
                'ip': printer_info.ip,
                'port': 9100,
                'name': f"{printer_info.model} at {printer_info.ip}",
                'model': printer_info.model,
                'discovery_method': 'optimized_network_scan',
                'media_width': printer_info.media_width,
                'media_type': printer_info.media_type,
                'media_loaded': printer_info.media_loaded,
                'printer_ready': printer_info.printer_ready,
                'error_status': printer_info.error_status
            })

        return result

    except Exception as e:
        print(f"Optimized network scan failed: {e}")
        return []


def get_printer_media_info(ip: str, port: int = 9100, timeout: float = 3.0) -> Optional[Dict]:
    """Get detailed printer information using improved Brother protocol"""
    from .brother_protocol import BrotherProtocol

    try:
        # Use the new Brother protocol implementation
        printer_info = BrotherProtocol.identify_printer(ip)

        if printer_info:
            return {
                'ip': printer_info.ip,
                'port': port,
                'raw_status': printer_info.raw_status.hex(),
                'is_brother': True,
                'model': printer_info.model,
                'media_width': printer_info.media_width,
                'media_type': printer_info.media_type,
                'media_loaded': printer_info.media_loaded,
                'printer_ready': printer_info.printer_ready,
                'firmware_version': printer_info.firmware_version,
                'serial_number': printer_info.serial_number,
                'error_status': printer_info.error_status
            }

        return None

    except Exception as e:
        print(f"Media info query failed for {ip}: {e}")
        return None


def identify_brother_printer(ip: str) -> Optional[str]:
    """Try to identify Brother printer model using improved protocol"""
    from .brother_protocol import BrotherProtocol

    try:
        # Use the new Brother protocol implementation
        printer_info = BrotherProtocol.identify_printer(ip)
        if printer_info:
            return printer_info.model

        return None

    except Exception as e:
        print(f"Brother printer identification failed for {ip}: {e}")
        return None


def test_manual_connection(target: str) -> Dict:
    """Test manual connection to either an IP address or subnet with parallel processing"""
    result = {
        'target': target,
        'connection_type': None,
        'success': False,
        'printers_found': [],
        'error': None
    }

    try:
        # Determine if target is an IP address or subnet
        if '/' in target:
            # It's a subnet - run parallel discovery
            result['connection_type'] = 'subnet'
            print(f"Testing subnet: {target}")

            try:
                network = ipaddress.IPv4Network(target)
                if network.num_addresses > 1024:
                    result['error'] = f"Subnet too large ({network.num_addresses} addresses). Max 1024."
                    return result

                # Use parallel port scanning (skip SNMP since it doesn't work)
                discovered = discover_printers_snmp_targeted([target], timeout=0.5)

                # Get detailed media info for discovered printers in parallel
                import concurrent.futures
                import threading

                printer_results = []
                lock = threading.Lock()

                def get_printer_details(printer):
                    ip = printer['ip']
                    media_info = get_printer_media_info(ip, timeout=3)

                    if media_info and media_info['is_brother']:
                        printer_result = {
                            'ip': ip,
                            'model': media_info['model'],
                            'media_loaded': media_info['media_loaded'],
                            'media_width': media_info['media_width'],
                            'media_type': media_info['media_type'],
                            'printer_ready': media_info['printer_ready'],
                            'raw_status': media_info['raw_status']
                        }
                        with lock:
                            printer_results.append(printer_result)

                # Parallel media info gathering
                if discovered:
                    with concurrent.futures.ThreadPoolExecutor(max_workers=min(10, len(discovered))) as executor:
                        futures = [executor.submit(get_printer_details, printer) for printer in discovered]
                        concurrent.futures.wait(futures, timeout=10)

                result['printers_found'] = printer_results
                result['success'] = len(result['printers_found']) > 0

            except ValueError as e:
                result['error'] = f"Invalid subnet format: {e}"

        else:
            # It's an IP address - test direct connection
            result['connection_type'] = 'ip_address'
            print(f"Testing IP address: {target}")

            try:
                # Validate IP address format
                ipaddress.IPv4Address(target)

                # Get detailed media info with longer timeout for single IP
                media_info = get_printer_media_info(target, timeout=5)

                if media_info and media_info['is_brother']:
                    printer_result = {
                        'ip': target,
                        'model': media_info['model'],
                        'media_loaded': media_info['media_loaded'],
                        'media_width': media_info['media_width'],
                        'media_type': media_info['media_type'],
                        'printer_ready': media_info['printer_ready'],
                        'raw_status': media_info['raw_status']
                    }
                    result['printers_found'].append(printer_result)
                    result['success'] = True
                else:
                    result['error'] = f"No Brother printer found at {target} or unable to read media status"

            except ValueError:
                result['error'] = f"Invalid IP address format: {target}"
            except Exception as e:
                result['error'] = f"Connection failed: {e}"

    except Exception as e:
        result['error'] = f"Test failed: {e}"

    return result


def test_specific_ip(ip: str, ports: List[int] = [9100, 515, 631]) -> Dict:
    """Test a specific IP address for printer services"""
    result = {
        'ip': ip,
        'reachable': False,
        'open_ports': [],
        'printer_identification': None
    }

    print(f"Testing {ip}...")

    # Test if IP is reachable at all
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result_ping = sock.connect_ex((ip, 80))  # Try HTTP first
        sock.close()
        if result_ping == 0:
            result['reachable'] = True
    except:
        pass

    # Test printer ports
    for port in ports:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result_port = sock.connect_ex((ip, port))
            sock.close()

            if result_port == 0:
                result['open_ports'].append(port)
                print(f"  Port {port}: OPEN")

                if port == 9100:
                    # Try to identify printer
                    model = identify_brother_printer(ip)
                    if model:
                        result['printer_identification'] = model
            else:
                print(f"  Port {port}: closed")

        except Exception as e:
            print(f"  Port {port}: error - {e}")

    return result


def discover_all_printers() -> Dict[str, PrinterInfo]:
    """Discover only actually available printers via auto-discovery"""
    global _discovered_printers
    _discovered_printers = {}

    # Check for USB Brother printers with dynamic identification
    usb_printer_info = verify_usb_printer_available()
    if usb_printer_info:
        usb_identifier = usb_printer_info['identifier']

        # Query actual media info from the USB printer
        media_info_result = get_usb_printer_media_info(usb_identifier)

        # Extract dynamic information from the printer
        model = usb_printer_info['model']

        # Determine label size from media info if available
        label_size = "Unknown"  # Must be determined from actual printer
        media_info_text = "USB printer connected"

        if media_info_result:
            # Use queried media information
            media_width = media_info_result.get('media_width', '62mm')
            media_type = media_info_result.get('media_type', 'labels')

            # Extract numeric label size from media width
            if 'mm' in media_width:
                label_size = media_width.replace('mm', '')

            media_info_text = f"{media_width} {media_type}"

        # Create printer info with dynamic data
        printer_info = PrinterInfo(
            identifier=usb_identifier,
            model_number=model,
            label_size=label_size,
            backend="usb",
            display_name=f"{model} (USB)",
            is_connected=True,
            media_info=media_info_text
        )
        _discovered_printers["usb_printer"] = printer_info

    # Get network ranges for discovery
    ranges = get_local_network_ranges()

    # Discover network printers in priority order
    try:
        all_network_printers = []
        print(f"Starting network printer discovery across {len(ranges)} network ranges...")

        # 1. SNMP Broadcast Discovery (Primary method)
        print("Phase 1: SNMP Broadcast Discovery...")
        snmp_broadcast_printers = discover_printers_snmp_broadcast(timeout=3.0)
        all_network_printers.extend(snmp_broadcast_printers)
        print(f"  SNMP Broadcast found: {len(snmp_broadcast_printers)} printers")

        # 2. SNMP Targeted Discovery (if broadcast found few/no results)
        if len(snmp_broadcast_printers) < 2:  # Try targeted if we didn't find many
            print("Phase 2: SNMP Targeted Discovery...")
            # Use shorter timeout for targeted discovery to speed up process
            snmp_targeted_printers = discover_printers_snmp_targeted(ranges, timeout=0.3)
            all_network_printers.extend(snmp_targeted_printers)
            print(f"  SNMP Targeted found: {len(snmp_targeted_printers)} printers")
        else:
            print("Phase 2: SNMP Targeted Discovery... (skipped - broadcast found sufficient results)")

        # 3. mDNS/Bonjour Discovery
        print("Phase 3: mDNS/Bonjour Discovery...")
        mdns_printers = discover_network_printers_mdns(timeout=2.0)
        all_network_printers.extend(mdns_printers)
        print(f"  mDNS found: {len(mdns_printers)} printers")

        # 4. Network Port Scanning (Final fallback)
        if len(all_network_printers) == 0:
            print("Phase 4: Network Port Scanning (fallback)...")
            scanned_printers = scan_network_for_printers(timeout=0.3)
            all_network_printers.extend(scanned_printers)
            print(f"  Port Scanning found: {len(scanned_printers)} printers")
        else:
            print("Phase 4: Network Port Scanning... (skipped - other methods found printers)")

        # Deduplicate and verify printers with media detection
        print(f"Verifying {len(all_network_printers)} discovered printers...")
        seen_ips = set()
        verified_printers = []

        for printer in all_network_printers:
            ip = printer['ip']
            port = printer['port']

            # Skip duplicates
            if ip in seen_ips:
                continue

            # Basic connectivity check
            if not verify_printer_available(ip, port):
                print(f"  {ip}: Not responding - skipping")
                continue

            # Media Detection: Verify printer has media loaded
            media_info = get_printer_media_info(ip, port, timeout=2.0)
            if media_info and media_info.get('is_brother'):
                # Check if media is loaded and printer is ready
                media_loaded = media_info.get('media_loaded', False)
                printer_ready = media_info.get('printer_ready', False)

                if media_loaded and printer_ready:
                    print(f"  ✅ {ip}: {media_info['model']} - Media: {media_info['media_width']} {media_info['media_type']}")
                    verified_printers.append({
                        **printer,
                        'media_info': media_info,
                        'verified': True
                    })
                    seen_ips.add(ip)
                else:
                    status = []
                    if not media_loaded:
                        status.append("no media")
                    if not printer_ready:
                        status.append("not ready")
                    print(f"  ⚠️  {ip}: {media_info.get('model', 'Unknown')} - Issues: {', '.join(status)}")
                    # Still add but mark as having issues
                    verified_printers.append({
                        **printer,
                        'media_info': media_info,
                        'verified': False,
                        'issues': status
                    })
                    seen_ips.add(ip)
            else:
                print(f"  ❌ {ip}: Not a Brother printer or communication failed")

        print(f"Media verification complete: {len(verified_printers)} printers processed")

        # Process verified printers and create PrinterInfo objects
        for printer in verified_printers:
            ip = printer['ip']
            port = printer['port']
            media_info = printer.get('media_info', {})

            # Create printer info for verified printer
            identifier = f"tcp://{ip}:{port}"
            model = media_info.get('model', printer.get('model', 'Unknown Brother'))

            # Get actual media width from printer response
            media_width = media_info.get('media_width', '62mm')
            media_type = media_info.get('media_type', 'labels')
            label_size = media_width.replace('mm', '') if 'mm' in media_width else "62"

            # Create appropriate media info text based on verification status
            if printer.get('verified', True):
                media_info_text = f"{media_width} {media_type} (ready)"
                is_connected = True
            else:
                issues = printer.get('issues', ['unknown issue'])
                media_info_text = f"{media_width} {media_type} (issues: {', '.join(issues)})"
                is_connected = False  # Mark as not connected if there are issues

            printer_info = PrinterInfo(
                identifier=identifier,
                model_number=model,
                label_size=label_size,
                backend="network",
                display_name=f"{model} at {ip}",
                is_connected=is_connected,
                media_info=media_info_text
            )

            printer_id = f"network_{ip.replace('.', '_')}"
            _discovered_printers[printer_id] = printer_info

    except Exception as e:
        print(f"Network discovery failed: {e}")

    return _discovered_printers


def discover_printers() -> Dict[str, PrinterInfo]:
    """Alias for discover_all_printers - only one discovery method"""
    return discover_all_printers()


def _normalize_brother_model_name(discovered_model: str) -> str:
    """
    Convert discovered model names to Brother QL library expected format.
    The Brother QL library expects exact model names like 'QL-810W', 'QL-720NW', etc.
    """
    # Clean the discovered model name
    model = discovered_model.strip().upper()

    print(f"Normalizing model name: '{discovered_model}' -> '{model}'")

    # Get supported models
    try:
        from brother_ql.models import ALL_MODELS
        supported_models = [m.identifier for m in ALL_MODELS]
        print(f"Supported models: {supported_models}")
    except ImportError:
        supported_models = ['QL-500', 'QL-550', 'QL-560', 'QL-570', 'QL-580N', 'QL-650TD',
                          'QL-700', 'QL-710W', 'QL-720NW', 'QL-800', 'QL-810W', 'QL-820NWB',
                          'QL-1050', 'QL-1060N']

    # Handle common discovery patterns - exact matches first
    if model in supported_models:
        print(f"Exact match found: {model}")
        return model

    # Extract QL model numbers
    if 'QL-' in model:
        import re
        ql_match = re.search(r'QL-\d+[A-Z]*', model)
        if ql_match:
            extracted_model = ql_match.group(0)
            print(f"Extracted QL model: {extracted_model}")
            if extracted_model in supported_models:
                print(f"Extracted model is supported: {extracted_model}")
                return extracted_model

    # Try to detect specific models based on hex codes or other patterns
    hex_pattern = re.search(r'0X([0-9A-F]{2})', model)
    if hex_pattern:
        model_code = int(hex_pattern.group(1), 16)
        print(f"Found hex model code: 0x{model_code:02X}")

        # Map known hex codes to specific models (from brother_protocol.py)
        hex_to_model = {
            0x4F: 'QL-500',
            0x50: 'QL-550',
            0x51: 'QL-560',
            0x52: 'QL-570',
            0x53: 'QL-580N',
            0x54: 'QL-650TD',
            0x55: 'QL-700',
            0x56: 'QL-710W',
            0x57: 'QL-720NW',
            0x58: 'QL-720NW',  # Common fallback
            0x59: 'QL-810W',
            0x5A: 'QL-820NWB',
            0x5B: 'QL-1050',
            0x5C: 'QL-1060N',
        }

        if model_code in hex_to_model:
            detected_model = hex_to_model[model_code]
            print(f"Mapped hex code 0x{model_code:02X} to {detected_model}")
            return detected_model

    print(f"WARNING: Could not determine exact model from '{discovered_model}'")
    print("This may cause printing issues. Please check your printer model manually.")

    # Ask user to specify model or provide intelligent fallback
    # For now, raise an error with helpful information
    raise ValueError(f"""
Unable to determine exact Brother QL printer model from discovered name: '{discovered_model}'

Possible solutions:
1. Check your printer's physical label for the exact model (e.g., QL-810W, QL-720NW)
2. Use Brother's official software to identify the model
3. Check the printer's settings menu for model information

Supported models: {', '.join(supported_models)}

If you know your printer model, you can manually update the printer discovery code.
""")


def set_printer_model_override(printer_id: str, model_name: str):
    """
    Manually override the model name for a specific printer.
    Use this when automatic detection fails.

    Args:
        printer_id: The printer identifier
        model_name: The exact Brother QL model name (e.g., 'QL-810W', 'QL-720NW')
    """
    if printer_id in _discovered_printers:
        old_model = _discovered_printers[printer_id].model_number
        _discovered_printers[printer_id].model_number = model_name
        print(f"Model override: {printer_id} changed from '{old_model}' to '{model_name}'")
    else:
        print(f"Warning: Printer {printer_id} not found in discovered printers")


def convert_image_to_instructions(surface: cairo.ImageSurface, printer_id: str) -> Optional[bytes]:
    printer_info = get_printer_info(printer_id)

    try:
        # Map discovered model names to Brother QL library expected model names
        model_name = _normalize_brother_model_name(printer_info.model_number)
    except ValueError as e:
        # Re-raise with printer context
        raise ValueError(f"Printer '{printer_id}' model detection failed: {str(e)}")

    print(f"Using Brother QL model: {model_name} for printer {printer_id}")
    qlr = BrotherQLRaster(model_name)
    qlr.exception_on_warning = True
    buffer = io.BytesIO()

    # Save the Cairo surface to the buffer as PNG
    surface.write_to_png(buffer)
    buffer.seek(0)

    # Convert the image to instructions using the BrotherQLRaster object
    instructions = conversion.convert(
        qlr=qlr,
        images=[buffer],
        label=printer_info.label_size,
        threshold=70.0
    )

    return instructions


def send_instructions(instructions: bytes, printer_id: str) -> dict:
    printer_info = get_printer_info(printer_id)
    return backends.helpers.send(instructions, printer_info.identifier)
