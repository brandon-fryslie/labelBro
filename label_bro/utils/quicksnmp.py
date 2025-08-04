import socket
import struct
import time
from typing import List, Tuple, Dict, Optional


class SNMPPacket:
    """Lightweight SNMP packet builder and parser"""
    
    # SNMP ASN.1 BER types
    INTEGER = 0x02
    OCTET_STRING = 0x04
    NULL = 0x05
    OBJECT_IDENTIFIER = 0x06
    SEQUENCE = 0x30
    GET_REQUEST = 0xA0
    GET_RESPONSE = 0xA2
    
    @staticmethod
    def encode_length(length: int) -> bytes:
        """Encode length using ASN.1 BER rules"""
        if length < 0x80:
            return bytes([length])
        else:
            # Long form - not needed for our simple use case
            return bytes([0x81, length])
    
    @staticmethod
    def encode_integer(value: int) -> bytes:
        """Encode integer as ASN.1 BER"""
        if value == 0:
            data = b'\x00'
        else:
            # Convert to bytes, handling sign
            data = value.to_bytes((value.bit_length() + 7) // 8, 'big', signed=True)
        return bytes([SNMPPacket.INTEGER]) + SNMPPacket.encode_length(len(data)) + data
    
    @staticmethod
    def encode_string(value: str) -> bytes:
        """Encode string as ASN.1 BER octet string"""
        data = value.encode('ascii')
        return bytes([SNMPPacket.OCTET_STRING]) + SNMPPacket.encode_length(len(data)) + data
    
    @staticmethod
    def encode_null() -> bytes:
        """Encode NULL as ASN.1 BER"""
        return bytes([SNMPPacket.NULL, 0x00])
    
    @staticmethod
    def encode_oid(oid_string: str) -> bytes:
        """Encode OID string (e.g., '1.3.6.1.2.1.1.1.0') as ASN.1 BER"""
        parts = [int(x) for x in oid_string.split('.')]
        
        # First two components are encoded as: first * 40 + second
        if len(parts) < 2:
            raise ValueError("OID must have at least 2 components")
        
        encoded = [parts[0] * 40 + parts[1]]
        
        # Encode remaining components
        for part in parts[2:]:
            if part < 0x80:
                encoded.append(part)
            else:
                # Multi-byte encoding for large values
                temp = []
                while part > 0:
                    temp.insert(0, (part & 0x7F) | (0x80 if len(temp) > 0 else 0))
                    part >>= 7
                encoded.extend(temp)
        
        data = bytes(encoded)
        return bytes([SNMPPacket.OBJECT_IDENTIFIER]) + SNMPPacket.encode_length(len(data)) + data
    
    @staticmethod
    def encode_sequence(contents: bytes) -> bytes:
        """Encode sequence container"""
        return bytes([SNMPPacket.SEQUENCE]) + SNMPPacket.encode_length(len(contents)) + contents
    
    @staticmethod
    def build_get_request(community: str, request_id: int, oid: str) -> bytes:
        """Build a complete SNMP GET request packet"""
        # Build varbind (OID + NULL value)
        varbind = SNMPPacket.encode_oid(oid) + SNMPPacket.encode_null()
        varbind_seq = SNMPPacket.encode_sequence(varbind)
        varbind_list = SNMPPacket.encode_sequence(varbind_seq)
        
        # Build PDU
        pdu_contents = (
            SNMPPacket.encode_integer(request_id) +  # Request ID
            SNMPPacket.encode_integer(0) +            # Error status
            SNMPPacket.encode_integer(0) +            # Error index
            varbind_list                              # Variable bindings
        )
        pdu = bytes([SNMPPacket.GET_REQUEST]) + SNMPPacket.encode_length(len(pdu_contents)) + pdu_contents
        
        # Build message
        message_contents = (
            SNMPPacket.encode_integer(0) +                    # SNMP version (0 = SNMPv1)
            SNMPPacket.encode_string(community) +             # Community string
            pdu                                               # PDU
        )
        
        return SNMPPacket.encode_sequence(message_contents)
    
    @staticmethod
    def parse_response(packet: bytes) -> Optional[Dict]:
        """Parse SNMP response packet - simplified parser"""
        try:
            # Very basic parsing - just look for Brother printer indicators
            packet_str = packet.decode('ascii', errors='ignore').lower()
            
            result = {
                'raw_packet': packet,
                'text_content': packet_str,
                'is_brother': False,
                'model': None
            }
            
            # Check for Brother printer indicators
            if 'brother' in packet_str:
                result['is_brother'] = True
                
                # Try to extract model
                if 'ql-800' in packet_str or 'ql800' in packet_str:
                    result['model'] = 'QL-800'
                elif 'ql-810' in packet_str or 'ql810' in packet_str:
                    result['model'] = 'QL-810W'
                elif 'ql-' in packet_str:
                    result['model'] = 'QL-Series'
                else:
                    result['model'] = 'Brother Printer'
            
            return result
        except Exception:
            return None


def discover_printers_broadcast(timeout: float = 5.0, max_responses: int = 10) -> List[Dict]:
    """
    Discover Brother printers using SNMP broadcast with improved reliability
    """
    discovered = []
    
    # Brother SNMP OIDs to try
    SYSTEM_DESC_OID = "1.3.6.1.2.1.1.1.0"  # System description
    
    try:
        # Create UDP socket for SNMP
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        
        # Bind to any available port
        sock.bind(('', 0))
        
        print(f"Broadcasting SNMP discovery request...")
        
        # Try multiple broadcast addresses and requests
        broadcast_addresses = [
            '255.255.255.255',
            '192.168.255.255',  # Class C broadcast
            '10.255.255.255',   # Class A broadcast
        ]
        
        for broadcast_addr in broadcast_addresses:
            try:
                # Build SNMP GET request with different request IDs
                req_id = abs(hash(broadcast_addr)) % 32768  # Keep within 16-bit range
                request_packet = SNMPPacket.build_get_request("public", req_id, SYSTEM_DESC_OID)
                sock.sendto(request_packet, (broadcast_addr, 161))
                print(f"  Sent broadcast to {broadcast_addr}")
            except Exception as e:
                print(f"  Failed to send to {broadcast_addr}: {e}")
        
        # Collect responses with longer timeout
        start_time = time.time()
        seen_ips = set()
        sock.settimeout(1.0)  # Longer timeout for responses
        
        while (time.time() - start_time) < timeout and len(discovered) < max_responses:
            try:
                data, addr = sock.recvfrom(2048)  # Larger buffer
                ip = addr[0]
                
                # Skip local/loopback addresses
                if ip.startswith('127.') or ip.startswith('169.254.'):
                    continue
                
                # Skip duplicates
                if ip in seen_ips:
                    continue
                seen_ips.add(ip)
                
                print(f"  Received SNMP response from {ip} ({len(data)} bytes)")
                
                # Parse response - be more lenient about Brother detection
                result = SNMPPacket.parse_response(data)
                is_brother = False
                model = "Unknown"
                
                if result:
                    is_brother = result['is_brother']
                    model = result['model'] or "Brother Printer"
                
                # Also check if response looks like a printer based on packet structure
                if not is_brother and len(data) > 30:
                    # Many printers respond to SNMP even without "Brother" in the text
                    # Check if it's on port 9100 (printer port)
                    try:
                        test_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        test_sock.settimeout(0.5)
                        if test_sock.connect_ex((ip, 9100)) == 0:
                            is_brother = True
                            model = "Network Printer"
                        test_sock.close()
                    except:
                        pass
                
                if is_brother:
                    print(f"  Found printer via SNMP broadcast: {ip} -> {model}")
                    
                    discovered.append({
                        'ip': ip,
                        'port': 9100,
                        'name': f"{model} at {ip}",
                        'model': model,
                        'discovery_method': 'SNMP_broadcast',
                        'description': result['text_content'][:100] if result else f"SNMP response from {ip}"
                    })
                else:
                    print(f"  SNMP response from {ip} but not identified as printer")
                
            except socket.timeout:
                continue
            except Exception as e:
                print(f"Error processing SNMP response: {e}")
                continue
        
        sock.close()
        
    except Exception as e:
        print(f"SNMP broadcast discovery failed: {e}")
    
    print(f"SNMP broadcast found {len(discovered)} printers")
    return discovered


def get_single(target_ip: str, oid: str, community: str = "public", timeout: float = 2.0) -> Optional[str]:
    """
    Send SNMP GET request to a specific IP address
    Returns the response value as string or None if failed
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(timeout)
        
        # Build and send request
        request_packet = SNMPPacket.build_get_request(community, 1, oid)
        sock.sendto(request_packet, (target_ip, 161))
        
        # Receive response
        data, addr = sock.recvfrom(1024)
        sock.close()
        
        # Parse response
        result = SNMPPacket.parse_response(data)
        if result:
            return result['text_content']
        
    except Exception as e:
        print(f"SNMP GET to {target_ip} failed: {e}")
    
    return None


# Legacy compatibility functions for existing code
def get(target, oids, credentials, port=161, **kwargs):
    """Compatibility function for existing code"""
    if isinstance(oids, list) and len(oids) > 0:
        result = get_single(target, oids[0])
        if result:
            return {oids[0]: result}
    return {}


def broadcastSNMPReq(reqMsg, cbRecvFun, cbTimerFun, max_number_of_responses=10):
    """Compatibility function - use discover_printers_broadcast instead"""
    # This is a simplified implementation that calls our broadcast discovery
    # The callback approach is complex, so we'll just return discovered printers
    discovered = discover_printers_broadcast(max_responses=max_number_of_responses)
    
    # Call the receive callback for each discovered printer
    for printer in discovered:
        try:
            # Simulate the callback with basic transport info
            transport_address = (printer['ip'], 161)
            cbRecvFun(None, None, transport_address, None)
        except Exception:
            pass