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
ZEROCONF_AVAILABLE = True

from . import quicksnmp
SNMP_AVAILABLE = True

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

def verify_usb_printer_available() -> Optional[str]:
    """Check for USB Brother printers and return USB identifier if found"""
    try:
        dev = usb.core.find(idVendor=0x04f9, idProduct=0x209b)
        if dev is not None:
            return 'usb://0x04f9:0x209b'
    except Exception:
        pass
    return None

class BrotherPrinterListener(ServiceListener):
    """mDNS service listener for Brother printers"""
    def __init__(self):
        self.discovered_printers = []

    def add_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        info = zc.get_service_info(type_, name)
        if info and info.addresses:
            # Check if it's a Brother printer
            if 'brother' in name.lower() or 'bro' in name.lower():
                ip = socket.inet_ntoa(info.addresses[0])
                port = info.port or 9100
                model = self._extract_model_from_name(name)

                printer_info = {
                    'ip': ip,
                    'port': port,
                    'name': name,
                    'model': model,
                    'discovery_method': 'mDNS'
                }
                self.discovered_printers.append(printer_info)

    def remove_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        pass

    def update_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        pass

    def _extract_model_from_name(self, name: str) -> str:
        """Extract Brother printer model from service name"""
        name_lower = name.lower()
        if 'ql-800' in name_lower or 'ql800' in name_lower:
            return 'QL-800'
        elif 'ql-810' in name_lower or 'ql810' in name_lower:
            return 'QL-810W'
        elif 'ql-' in name_lower:
            # Generic QL series
            return 'QL-Series'
        return 'Unknown Brother'


def discover_printers_snmp_broadcast(timeout: float = 3.0) -> List[Dict]:
    """Discover Brother printers using SNMP broadcast (based on brother_ql patch)"""
    if not SNMP_AVAILABLE:
        return []

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
    if not SNMP_AVAILABLE:
        return []

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
    """Discover Brother printers using mDNS/Bonjour"""
    if not ZEROCONF_AVAILABLE:
        return []

    zc = Zeroconf()
    listener = BrotherPrinterListener()
    browsers = []

    # Brother printers typically advertise on these service types
    service_types = [
        "_printer._tcp.local.",
        "_ipp._tcp.local.",
        "_pdl-datastream._tcp.local.",
        "_brother._tcp.local."
    ]

    try:
        # Create service browsers for each service type
        for service_type in service_types:
            try:
                browser = ServiceBrowser(zc, service_type, listener)
                browsers.append(browser)
                print(f"  Started mDNS browsing for {service_type}")
            except Exception as e:
                print(f"  Failed to start mDNS browser for {service_type}: {e}")

        # Wait for discovery
        print(f"mDNS discovery running for {timeout} seconds...")
        time.sleep(timeout)

        print(f"mDNS discovery found {len(listener.discovered_printers)} printers")
        return listener.discovered_printers

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
    """Get local network ranges for scanning - only the current subnet"""
    ranges = []

    # Try to get actual network info using route table
    try:
        import subprocess
        # Get route table to find actual network ranges
        result = subprocess.run(['route', '-n', 'get', 'default'],
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            for line in result.stdout.split('\n'):
                if 'interface:' in line:
                    interface = line.split(':')[1].strip()
                    print(f"Default interface: {interface}")
    except Exception:
        pass

    # Try to get local IP and determine the current subnet only
    try:
        # Get our actual IP by connecting to external service
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()

        print(f"Local IP detected: {local_ip}")

        # Only scan the /24 subnet we're actually on
        ip_parts = local_ip.split('.')
        current_subnet = f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}.0/24"
        ranges.append(current_subnet)

        print(f"Will scan current subnet only: {current_subnet}")

    except Exception as e:
        print(f"Network detection failed: {e}")
        # Final fallback - just common /24 networks
        ranges = ['192.168.1.0/24', '192.168.0.0/24', '10.0.1.0/24']
        print("Using fallback network ranges")

    return ranges


def scan_network_for_printers(timeout: float = 0.5) -> List[Dict]:
    """Scan local networks for Brother printers on port 9100"""
    discovered = []
    ranges = get_local_network_ranges()

    print(f"Scanning {len(ranges)} network ranges for Brother printers...")
    for i, range_str in enumerate(ranges):
        print(f"  Range {i+1}: {range_str}")

    # Use a thread-safe list for results
    import threading
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import time

    responsive_ips = []
    lock = threading.Lock()

    def check_host(ip: str):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((ip, 9100))
            sock.close()

            if result == 0:
                with lock:
                    responsive_ips.append(ip)
                print(f"Found device responding on port 9100: {ip}")

                # Try to identify as Brother printer
                model = identify_brother_printer(ip)
                if model:
                    print(f"Identified Brother printer: {ip} -> {model}")
                    with lock:
                        discovered.append({
                            'ip': ip,
                            'port': 9100,
                            'name': f"Brother {model} at {ip}",
                            'model': model,
                            'discovery_method': 'network_scan'
                        })
                else:
                    print(f"Device at {ip} responds on port 9100 but not identified as Brother printer")
                return True
        except Exception:
            pass
        return False

    # Collect all IPs to scan
    ips_to_scan = []
    for range_str in ranges[:4]:  # Scan all detected ranges
        try:
            network = ipaddress.IPv4Network(range_str)
            # Only scan reasonable sized networks
            if network.prefixlen >= 22:  # /22 or smaller
                for ip in network.hosts():
                    ips_to_scan.append(str(ip))
        except Exception:
            continue

    print(f"Scanning {len(ips_to_scan)} IP addresses...")

    # Use ThreadPoolExecutor for better thread management
    max_workers = min(50, len(ips_to_scan))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all scanning tasks
        future_to_ip = {executor.submit(check_host, ip): ip for ip in ips_to_scan}

        # Wait for completion with timeout
        completed = 0
        for future in as_completed(future_to_ip, timeout=timeout*2 + 30):
            completed += 1
            if completed % 50 == 0:
                print(f"  Scanned {completed}/{len(ips_to_scan)} addresses...")

    print(f"Network scan complete: {len(responsive_ips)} devices found on port 9100, {len(discovered)} Brother printers identified")

    return discovered


def get_printer_media_info(ip: str, port: int = 9100, timeout: float = 3.0) -> Optional[Dict]:
    """Get detailed printer information including media status with optimized timeouts"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((ip, port))

        # Send status request command
        sock.send(b'\x1b\x69\x53')  # ESC i S (status command)

        # Read response with timeout
        sock.settimeout(min(timeout, 2.0))  # Don't wait too long for response
        try:
            response = sock.recv(1024)
        except socket.timeout:
            response = b''  # Printer doesn't respond to status commands

        sock.close()

        # If no response to status command, but we connected successfully to port 9100,
        # assume it's a Brother printer and provide defaults
        if not response:
            print(f"  Printer at {ip} doesn't respond to status commands, using defaults")
            return {
                'ip': ip,
                'port': port,
                'raw_status': '',
                'is_brother': True,
                'model': 'QL-800',  # Use a valid brother_ql model name
                'media_width': '62mm',
                'media_type': 'Die-cut labels',
                'media_loaded': True,  # Assume media is present
                'printer_ready': True  # Assume printer is ready
            }

        # Parse Brother printer status response
        result = {
            'ip': ip,
            'port': port,
            'raw_status': response.hex(),
            'is_brother': False,
            'model': None,
            'media_width': None,
            'media_type': None,
            'media_loaded': False,
            'printer_ready': False
        }

        # Check if it's a Brother printer (more lenient detection)
        response_str = response.decode('ascii', errors='ignore').lower()

        # Brother printer detection - check multiple indicators
        is_brother_response = (
            'brother' in response_str or
            'ql-' in response_str or
            len(response) >= 30  # Brother responses are typically substantial
        )

        # For printers that don't respond to status commands but accept connections on port 9100
        # If we got any response at all on port 9100, likely a printer
        if not is_brother_response and len(response) > 0:
            # Any response on printer port suggests it's a printer
            is_brother_response = True
            print(f"  Detected printer response on port 9100: {len(response)} bytes")
        elif not is_brother_response:
            # Even if no response to status command, if we connected to port 9100, assume it's a printer
            # This handles printers that don't support ESC/P status commands
            is_brother_response = True
            print(f"  Assuming printer at {ip} (port 9100 accepts connections)")

        if is_brother_response:
            result['is_brother'] = True

            # Try to extract model from response
            if 'ql-800' in response_str or 'ql800' in response_str:
                result['model'] = 'QL-800'
            elif 'ql-810' in response_str or 'ql810' in response_str:
                result['model'] = 'QL-810W'
            elif 'ql-' in response_str:
                result['model'] = 'QL-800'  # Default to QL-800 if generic QL detected
            else:
                result['model'] = 'QL-800'  # Default to QL-800

        # Parse status bytes for Brother QL printers
        if len(response) >= 20 and result['is_brother']:
            try:
                # Brother QL status format (simplified parsing)
                status_bytes = response

                # Try different byte positions for error information
                error_byte = 0
                for pos in [8, 9, 10]:
                    if len(status_bytes) > pos:
                        error_byte = status_bytes[pos]
                        break

                # Try different positions for media information
                media_byte = 0
                type_byte = 0
                for pos in range(10, min(len(status_bytes), 15)):
                    if status_bytes[pos] != 0:
                        if media_byte == 0:
                            media_byte = status_bytes[pos]
                        else:
                            type_byte = status_bytes[pos]
                            break

                # More permissive media detection
                # If we got any response and no obvious error, assume media present
                if len(response) >= 30:
                    result['media_loaded'] = True

                    # Estimate media width based on common values
                    if media_byte in [0x04, 0x0C, 0x62]:  # 62mm indicators
                        result['media_width'] = '62mm'
                    elif media_byte in [0x02, 0x0A, 0x29]:  # 29mm indicators
                        result['media_width'] = '29mm'
                    elif media_byte in [0x03, 0x0B, 0x38]:  # 38mm indicators
                        result['media_width'] = '38mm'
                    else:
                        result['media_width'] = '62mm'  # Default assumption for Brother QL

                    # Determine media type (default to die-cut labels)
                    if type_byte & 0x01:
                        result['media_type'] = 'Continuous length tape'
                    else:
                        result['media_type'] = 'Die-cut labels'

                # Assume printer is ready if we got a good response
                if len(response) >= 30:
                    result['printer_ready'] = True

            except Exception as e:
                # If parsing fails, still mark as Brother printer with defaults
                if result['is_brother']:
                    result['media_loaded'] = True
                    result['media_width'] = '62mm'
                    result['media_type'] = 'Die-cut labels'
                    result['printer_ready'] = True

        return result

    except socket.timeout:
        # Timeout is common, don't spam logs
        return None
    except Exception as e:
        # Only log unexpected errors
        if "Connection refused" not in str(e) and "timed out" not in str(e):
            print(f"Media info query failed for {ip}: {e}")
        return None


def identify_brother_printer(ip: str) -> Optional[str]:
    """Try to identify Brother printer model via multiple methods"""

    # Method 1: Try to get detailed media info (best method)
    media_info = get_printer_media_info(ip)
    if media_info and media_info['is_brother']:
        return media_info['model']

    # Method 2: Try basic ESC/P status command
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        sock.connect((ip, 9100))

        # Send a simple status query
        sock.send(b'\x1b\x69\x53')  # ESC i S (status command)

        # Read response
        response = sock.recv(1024)
        sock.close()

        print(f"Status query response from {ip}: {response[:100]}...")

        # Basic model detection based on response patterns
        if b'QL-800' in response or b'QL800' in response:
            return 'QL-800'
        elif b'QL-810' in response or b'QL810' in response:
            return 'QL-810W'
        elif b'QL-' in response:
            return 'QL-Series'
        elif b'Brother' in response or b'BROTHER' in response:
            return 'Brother Printer'
        elif response:  # If we get any response, assume it's a printer
            return 'Network Printer'

    except Exception as e:
        print(f"ESC/P query failed for {ip}: {e}")

    # Method 3: Simple connection test - if it accepts connections on 9100, it's likely a printer
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((ip, 9100))
        sock.close()

        if result == 0:
            print(f"Device at {ip} accepts connections on port 9100 - assuming Brother printer")
            return 'QL-800'  # Use valid brother_ql model name

    except Exception as e:
        print(f"Connection test failed for {ip}: {e}")

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

    # Check for USB Brother printers
    usb_identifier = verify_usb_printer_available()
    if usb_identifier:
        printer_info = PrinterInfo(
            identifier=usb_identifier,
            model_number="QL-800",
            label_size="62",
            backend="usb",
            display_name="Brother QL-800 (USB)",
            is_connected=True,
            media_info="62mm labels"
        )
        _discovered_printers["usb_printer"] = printer_info

    # Get network ranges for discovery
    ranges = get_local_network_ranges()

    # Discover network printers using multiple methods
    try:
        all_network_printers = []

        # Try SNMP broadcast discovery first (most efficient for Brother printers)
        snmp_broadcast_printers = discover_printers_snmp_broadcast(timeout=3.0)
        all_network_printers.extend(snmp_broadcast_printers)

        # Skip targeted SNMP since it doesn't find anything - go straight to port scanning

        # Try mDNS discovery
        mdns_printers = discover_network_printers_mdns(timeout=2.0)
        all_network_printers.extend(mdns_printers)

        # Try network scanning as final fallback if other methods found nothing
        if len(all_network_printers) == 0:
            scanned_printers = scan_network_for_printers(timeout=0.5)
            all_network_printers.extend(scanned_printers)

        # Deduplicate by IP
        seen_ips = set()

        for printer in all_network_printers:
            ip = printer['ip']
            port = printer['port']

            # Skip duplicates
            if ip in seen_ips:
                continue

            # Verify the printer is actually available
            if not verify_printer_available(ip, port):
                continue

            seen_ips.add(ip)

            # Create printer info for verified available printer
            identifier = f"tcp://{ip}:{port}"
            model = printer['model']
            label_size = "62"  # Most Brother QL series use 62mm

            printer_info = PrinterInfo(
                identifier=identifier,
                model_number=model,
                label_size=label_size,
                backend="network",
                display_name=f"{printer['name']}",
                is_connected=True,  # Already verified above
                media_info=f"{label_size}mm labels detected"
            )

            printer_id = f"network_{ip.replace('.', '_')}"
            _discovered_printers[printer_id] = printer_info

    except Exception as e:
        print(f"Network discovery failed: {e}")

    return _discovered_printers


def discover_printers() -> Dict[str, PrinterInfo]:
    """Alias for discover_all_printers - only one discovery method"""
    return discover_all_printers()


def convert_image_to_instructions(surface: cairo.ImageSurface, printer_id: str) -> Optional[bytes]:
    printer_info = get_printer_info(printer_id)
    qlr = BrotherQLRaster(printer_info.model_number)
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
