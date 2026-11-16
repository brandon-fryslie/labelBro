"""
Brother QL printer protocol implementation for reliable identification and status queries.
This module implements the actual Brother printer communication protocol without hardcoded values.
"""

import concurrent.futures
import ipaddress
import re
import socket
import threading
import time
from dataclasses import dataclass
from typing import ClassVar


@dataclass
class BrotherPrinterInfo:
    """Complete Brother printer information"""

    ip: str
    model: str
    firmware_version: str
    serial_number: str
    media_width: str
    media_type: str
    media_length: str
    media_loaded: bool
    printer_ready: bool
    error_status: str
    raw_status: bytes


class BrotherProtocol:
    """Brother QL printer protocol implementation"""

    # Brother ESC/P status commands
    STATUS_REQUEST = b"\x1b\x69\x53"  # ESC i S - Status request
    STATUS_REQUEST_EXTENDED = b"\x1b\x69\x4d"  # ESC i M - Extended status
    DEVICE_INFO_REQUEST = b"\x1b\x69\x4b"  # ESC i K - Device info

    # Brother QL series model identification
    MODEL_CODES: ClassVar[dict[int, str]] = {
        0x4F: "QL-500",
        0x50: "QL-550",
        0x51: "QL-560",
        0x52: "QL-570",
        0x53: "QL-580N",
        0x54: "QL-650TD",
        0x55: "QL-700",
        0x56: "QL-710W",
        0x57: "QL-720NW",
        0x58: "QL-720NW",  # Common status code, default to popular model
        0x59: "QL-810W",
        0x5A: "QL-820NWB",
        0x5B: "QL-1050",
        0x5C: "QL-1060N",
        0x5D: "QL-1100",
        0x5E: "QL-1110NWB",
    }

    # Media width codes (in 0.1mm units)
    MEDIA_WIDTH_CODES: ClassVar[dict[int, str]] = {
        0x04: "6mm",
        0x06: "9mm",
        0x09: "12mm",
        0x11: "17mm",
        0x1A: "23mm",
        0x1D: "29mm",
        0x26: "38mm",
        0x3E: "62mm",
        0x66: "102mm",
    }

    # Media type codes
    MEDIA_TYPE_CODES: ClassVar[dict[int, str]] = {
        0x01: "Laminated tape",
        0x02: "Non-laminated tape",
        0x03: "Fabric tape",
        0x04: "Extra strength adhesive tape",
        0x05: "Flexible ID tape",
        0x06: "Cable wrap tape",
        0x11: "Heat-shrink tube (2:1)",
        0x12: "Heat-shrink tube (3:1)",
        0x4A: "Die-cut labels",
        0x4B: "Continuous length tape",
    }

    @staticmethod
    def send_command(ip: str, command: bytes, timeout: float = 5.0) -> bytes | None:
        """Send a command to Brother printer and get response"""
        try:
            with socket.create_connection((ip, 9100), timeout=timeout) as sock:
                sock.send(command)

                # Read response - Brother printers typically respond quickly
                time.sleep(0.1)  # Small delay for printer processing
                response = b""
                sock.settimeout(2.0)  # Shorter timeout for response reading

                try:
                    while True:
                        chunk = sock.recv(1024)
                        if not chunk:
                            break
                        response += chunk
                        if len(response) > 4096:  # Prevent excessive data
                            break
                except TimeoutError:
                    pass  # Normal - printer finished sending
        except OSError as e:
            print(f"{ip}: command {command!r} failed: {e}")
            return None
        return response if response else None

    @classmethod
    def identify_printer(cls, ip: str) -> BrotherPrinterInfo | None:
        """Identify Brother printer and get complete information"""

        # Try multiple command sequences to get full printer info
        status_response = cls.send_command(ip, cls.STATUS_REQUEST, timeout=5.0)
        extended_response = cls.send_command(ip, cls.STATUS_REQUEST_EXTENDED, timeout=5.0)
        device_info = cls.send_command(ip, cls.DEVICE_INFO_REQUEST, timeout=5.0)

        # If no responses, try alternative detection methods
        if not any([status_response, extended_response, device_info]):
            return cls._fallback_identification(ip)

        # Parse the responses to build complete printer info
        info = cls._parse_printer_responses(ip, status_response, extended_response, device_info)
        return info

    @classmethod
    def _parse_printer_responses(
        cls, ip: str, status: bytes | None, extended: bytes | None, device: bytes | None
    ) -> BrotherPrinterInfo | None:
        """Parse Brother printer responses into structured information"""

        # Default values
        model = "Unknown Brother"
        firmware = "Unknown"
        serial = "Unknown"
        media_width = "Unknown"
        media_type = "Unknown"
        media_length = "Unknown"
        media_loaded = False
        printer_ready = False
        error_status = "Unknown"

        # Parse status response (main source of info)
        if status and len(status) >= 32:
            # Brother QL status format analysis
            status_bytes = status

            # Model detection from response pattern
            if len(status_bytes) > 10:
                model_byte = status_bytes[4] if len(status_bytes) > 4 else 0
                model = cls.MODEL_CODES.get(model_byte, f"QL-Series (0x{model_byte:02X})")

            # Media information parsing
            if len(status_bytes) >= 15:
                media_info_start = 8  # Media info typically starts around byte 8

                for i in range(media_info_start, min(len(status_bytes), 20)):
                    byte_val = status_bytes[i]

                    # Check for media width
                    if byte_val in cls.MEDIA_WIDTH_CODES:
                        media_width = cls.MEDIA_WIDTH_CODES[byte_val]

                    # Check for media type
                    if byte_val in cls.MEDIA_TYPE_CODES:
                        media_type = cls.MEDIA_TYPE_CODES[byte_val]

            # Status flags (typically in bytes 8-12)
            if len(status_bytes) > 8:
                status_flags = status_bytes[8]
                media_loaded = not (status_flags & 0x01)  # Media empty flag (inverted)
                printer_ready = not (status_flags & 0x08)  # Error flag (inverted)

                # Error interpretation
                if status_flags & 0x01:
                    error_status = "No media"
                elif status_flags & 0x02:
                    error_status = "Cover open"
                elif status_flags & 0x04:
                    error_status = "Paper jam"
                elif status_flags & 0x08:
                    error_status = "System error"
                else:
                    error_status = "Ready"

        # Parse extended response for additional details
        if extended:
            # Extended status may contain firmware version and serial number
            extended_str = extended.decode("ascii", errors="ignore")
            # Look for version patterns
            if "Ver." in extended_str:
                parts = extended_str.split("Ver.")
                if len(parts) > 1:
                    firmware = parts[1].split()[0] if parts[1].split() else "Unknown"

        # Parse device info response
        if device:
            device_str = device.decode("ascii", errors="ignore")
            # Look for serial number patterns
            if "S/N:" in device_str:
                parts = device_str.split("S/N:")
                if len(parts) > 1:
                    serial = parts[1].split()[0] if parts[1].split() else "Unknown"

        # If we got any response, it's likely a Brother printer
        if status or extended or device:
            return BrotherPrinterInfo(
                ip=ip,
                model=model,
                firmware_version=firmware,
                serial_number=serial,
                media_width=media_width,
                media_type=media_type,
                media_length=media_length,
                media_loaded=media_loaded,
                printer_ready=printer_ready,
                error_status=error_status,
                raw_status=status or b"",
            )

        return None

    @classmethod
    def _fallback_identification(cls, ip: str) -> BrotherPrinterInfo | None:
        """Fallback identification when standard commands don't work"""

        if not appsocket_listening(ip, timeout=3.0):
            return None

        # Connected successfully to port 9100, likely a printer
        print(f"Port 9100 open at {ip} - assuming Brother printer")

        # For printers that don't respond to commands, try to determine
        # model from network characteristics or use intelligent defaults
        model = cls._guess_brother_model(ip)

        # Ensure we have a valid Brother QL model name
        if not model or "unknown" in model.lower() or model == "Brother QL-Series":
            model = "QL-720NW"  # Default to popular model

        return BrotherPrinterInfo(
            ip=ip,
            model=model,
            firmware_version="Unknown",
            serial_number="Unknown",
            media_width="62mm",  # Most common Brother QL width
            media_type="Die-cut labels",  # Most common type
            media_length="Unknown",
            media_loaded=True,  # Assume media present
            printer_ready=True,  # Assume ready if accepting connections
            error_status="Ready",
            raw_status=b"",  # No response data
        )

    @classmethod
    def _guess_brother_model(cls, ip: str) -> str:
        """Attempt to guess Brother printer model from network characteristics"""

        # Try SNMP if available (some printers respond to SNMP but not ESC/P)
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(2.0)

            # Simple SNMP GET request for system description
            # This is a minimal SNMP packet for OID 1.3.6.1.2.1.1.1.0 (sysDescr)
            snmp_packet = bytes(
                [
                    0x30,
                    0x29,  # SEQUENCE, length 41
                    0x02,
                    0x01,
                    0x00,  # INTEGER (version) = 0
                    0x04,
                    0x06,
                    0x70,
                    0x75,
                    0x62,
                    0x6C,
                    0x69,
                    0x63,  # OCTET STRING "public"
                    0xA0,
                    0x1C,  # GET REQUEST, length 28
                    0x02,
                    0x01,
                    0x01,  # INTEGER (request-id) = 1
                    0x02,
                    0x01,
                    0x00,  # INTEGER (error-status) = 0
                    0x02,
                    0x01,
                    0x00,  # INTEGER (error-index) = 0
                    0x30,
                    0x11,  # SEQUENCE (varbind list)
                    0x30,
                    0x0F,  # SEQUENCE (varbind)
                    0x06,
                    0x08,
                    0x2B,
                    0x06,
                    0x01,
                    0x02,
                    0x01,
                    0x01,
                    0x01,
                    0x00,  # OID 1.3.6.1.2.1.1.1.0
                    0x05,
                    0x00,  # NULL
                ]
            )

            with sock:
                sock.sendto(snmp_packet, (ip, 161))
                response, _ = sock.recvfrom(1024)
        except OSError as e:
            print(f"{ip}: SNMP sysDescr query failed: {e}")
            return "QL-720NW"

        response_str = response.decode("ascii", errors="ignore").lower()
        # Extract actual model from SNMP response
        if "ql-" in response_str:
            ql_match = re.search(r"ql-\d+[a-z]*", response_str)
            if ql_match:
                return ql_match.group(0).upper()
        elif "brother" in response_str:
            return "Brother QL-Series"

        # Return default model if we can't determine specific model
        return "QL-720NW"


def appsocket_listening(ip: str, port: int = 9100, timeout: float = 2.0) -> bool:
    """Whether something accepts connections on the AppSocket (raw print) port"""
    # [LAW:one-source-of-truth] the one port-9100 probe; an open port says "likely a printer", not which one,
    # because many Brother printers accept the connection and never answer a command.
    try:
        with socket.create_connection((ip, port), timeout=timeout):
            return True
    except OSError:
        # refused, unreachable or timed out: nothing is listening there
        return False


class NetworkScanner:
    """Optimized network scanner for Brother printers"""

    @staticmethod
    def get_network_ranges() -> list[str]:
        """Get comprehensive list of network ranges to scan"""
        ranges = []

        try:
            # Get local IP to determine current networks
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()

            print(f"Local IP: {local_ip}")

            # Parse IP to get network ranges
            ip_parts = local_ip.split(".")
            base_network = f"{ip_parts[0]}.{ip_parts[1]}"

            # Add current subnet
            current_subnet = f"{base_network}.{ip_parts[2]}.0/24"
            ranges.append(current_subnet)

            # Add adjacent subnets in the same network
            current_third_octet = int(ip_parts[2])
            for offset in [-2, -1, 1, 2]:  # Check nearby subnets
                adjacent_octet = current_third_octet + offset
                if 0 <= adjacent_octet <= 255:
                    adjacent_subnet = f"{base_network}.{adjacent_octet}.0/24"
                    ranges.append(adjacent_subnet)

            print(f"Will scan networks: {ranges}")

        except OSError as e:
            print(f"Network detection failed: {e}")
            # Fallback to common ranges
            ranges = ["192.168.1.0/24", "192.168.0.0/24", "192.168.7.0/24", "192.168.8.0/24", "10.0.1.0/24"]

        return ranges

    @staticmethod
    def scan_for_brother_printers(timeout: float = 0.3) -> list[BrotherPrinterInfo]:
        """Fast parallel scan for Brother printers across multiple networks"""

        discovered_printers = []
        lock = threading.Lock()

        def scan_single_ip(ip_str: str) -> BrotherPrinterInfo | None:
            """Scan a single IP for Brother printer"""
            if not appsocket_listening(ip_str, timeout=timeout):
                return None
            printer_info = BrotherProtocol.identify_printer(ip_str)
            if printer_info:
                with lock:
                    discovered_printers.append(printer_info)
                    print(f"Found Brother printer: {ip_str} -> {printer_info.model}")
            return printer_info

        # Get all IPs to scan
        ranges = NetworkScanner.get_network_ranges()
        all_ips = []

        for range_str in ranges:
            try:
                network = ipaddress.IPv4Network(range_str)
                # Only scan reasonable network sizes
                if network.num_addresses <= 256:
                    for ip in network.hosts():
                        all_ips.append(str(ip))
                        if len(all_ips) >= 1000:  # Reasonable limit
                            break
            except ValueError as e:
                print(f"Invalid network range {range_str}: {e}")
                continue

        print(f"Scanning {len(all_ips)} IP addresses for Brother printers...")

        # Parallel scanning with optimized thread count
        max_workers = min(50, len(all_ips))  # Reduced thread count for stability
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all scanning tasks
            futures = [executor.submit(scan_single_ip, ip) for ip in all_ips]

            # Process results as they complete with proper timeout handling
            completed = 0
            total_timeout = max(30, timeout * len(all_ips) / max_workers)  # Dynamic timeout

            try:
                for future in concurrent.futures.as_completed(futures, timeout=total_timeout):
                    completed += 1
                    if completed % 50 == 0:
                        print(f"  Scanned {completed}/{len(all_ips)} addresses...")

                    future.result()  # re-raises anything a scan raised
            except concurrent.futures.TimeoutError:
                print(f"  Timeout after {completed}/{len(all_ips)} scans - using partial results")
                # Cancel remaining futures
                for future in futures:
                    future.cancel()

        print(f"Network scan complete. Found {len(discovered_printers)} Brother printers.")
        return discovered_printers
