#!/usr/bin/env python3
"""
Test script for enhanced Brother QL-810W mDNS discovery
Based on the detailed mDNS/DNS-SD specifications provided.

This script demonstrates the TXT record parsing approach for reliable
Brother printer identification via Bonjour/mDNS.
"""

import time
import socket
from zeroconf import Zeroconf, ServiceBrowser, ServiceListener
from typing import Dict, Optional


class BrotherQL810WListener(ServiceListener):
    """
    Enhanced mDNS listener specifically for Brother QL-810W printers
    using TXT record analysis as described in the protocol specification.
    """
    
    def __init__(self):
        self.discovered_printers = []
        self.start_time = time.time()

    def add_service(self, zeroconf: Zeroconf, service_type: str, name: str) -> None:
        """Called when a new service is discovered"""
        print(f"\n🔍 Analyzing service: {name} ({service_type})")
        
        info = zeroconf.get_service_info(service_type, name)
        if not info:
            print("  ❌ No service info available")
            return

        # Parse and display detailed service information
        self._analyze_service_info(info, service_type, name)

    def _analyze_service_info(self, info, service_type: str, name: str):
        """Detailed analysis of mDNS service info for Brother printers"""
        try:
            # Basic service info
            addresses = [socket.inet_ntoa(addr) for addr in info.addresses] if info.addresses else []
            port = info.port
            hostname = info.server
            
            print(f"  📍 Addresses: {addresses}")
            print(f"  🚪 Port: {port}")
            print(f"  🖥️  Hostname: {hostname}")
            
            # Parse TXT records (the key for Brother identification)
            properties = info.properties if info.properties else {}
            print(f"  📝 TXT Records ({len(properties)} found):")
            
            txt_records = {}
            for key, value in properties.items():
                try:
                    key_str = key.decode('utf-8', 'ignore') if isinstance(key, bytes) else str(key)
                    value_str = value.decode('utf-8', 'ignore') if isinstance(value, bytes) else str(value) if value is not None else ''
                    txt_records[key_str] = value_str
                    print(f"     {key_str} = '{value_str}'")
                except Exception as e:
                    print(f"     [decode error for key/value]: {e}")

            # Apply Brother QL-810W identification logic
            is_brother, model_info = self._identify_brother_printer(txt_records, name)
            
            if is_brother:
                print(f"  ✅ CONFIRMED: {model_info['model']} Brother printer!")
                print(f"     Manufacturer: {model_info['manufacturer']}")
                if model_info.get('mac'):
                    print(f"     MAC Address: {model_info['mac']}")
                if model_info.get('user_name'):
                    print(f"     User Name: {model_info['user_name']}")
                
                # Add to discovered printers
                printer_info = {
                    'ip': addresses[0] if addresses else 'unknown',
                    'port': port,
                    'model': model_info['model'],
                    'manufacturer': model_info['manufacturer'],
                    'service_type': service_type,
                    'service_name': name,
                    'hostname': hostname,
                    'txt_records': txt_records,
                    'discovery_time': time.time() - self.start_time,
                    **model_info
                }
                self.discovered_printers.append(printer_info)
            else:
                print(f"  ❌ Not a Brother printer")

        except Exception as e:
            print(f"  ⚠️ Error analyzing service: {e}")

    def _identify_brother_printer(self, txt_records: Dict[str, str], service_name: str) -> tuple[bool, Dict[str, str]]:
        """
        Brother QL-810W identification using TXT record analysis
        Based on the protocol specification provided.
        """
        model_info = {
            'model': 'Unknown',
            'manufacturer': 'Unknown',
            'mac': None,
            'user_name': None
        }

        # Method 1: Check 'ty' field (most reliable for Brother QL-810W)
        ty_field = txt_records.get('ty', '')
        if ty_field and 'QL-810W' in ty_field:
            model_info['model'] = ty_field
            model_info['manufacturer'] = 'Brother'
            is_brother = True
        
        # Method 2: Check 'product' field  
        elif txt_records.get('product', '') and 'QL-810W' in txt_records['product']:
            model_info['model'] = txt_records['product']
            model_info['manufacturer'] = 'Brother'
            is_brother = True
            
        # Method 3: Check USB model descriptor
        elif txt_records.get('usb_MDL', '') == 'QL-810W':
            model_info['model'] = f"Brother {txt_records['usb_MDL']}"
            model_info['manufacturer'] = txt_records.get('usb_MFG', 'Brother')
            is_brother = True
            
        # Method 4: Check for any Brother QL series
        elif any('QL-' in field.upper() for field in [ty_field, txt_records.get('product', ''), txt_records.get('usb_MDL', '')]):
            # Found a Brother QL series printer (but not necessarily QL-810W)
            for field in [ty_field, txt_records.get('product', ''), txt_records.get('usb_MDL', '')]:
                if 'QL-' in field.upper():
                    model_info['model'] = field if 'Brother' in field else f"Brother {field}"
                    break
            model_info['manufacturer'] = txt_records.get('usb_MFG', 'Brother')
            is_brother = True
            
        else:
            # Not a Brother printer
            is_brother = False

        if is_brother:
            # Extract additional info
            model_info['mac'] = txt_records.get('mac', '').upper() if txt_records.get('mac') else None
            model_info['user_name'] = txt_records.get('note', None)
            model_info['uuid'] = txt_records.get('UUID', None)

        return is_brother, model_info

    def remove_service(self, zeroconf: Zeroconf, service_type: str, name: str) -> None:
        print(f"📤 Service removed: {name}")

    def update_service(self, zeroconf: Zeroconf, service_type: str, name: str) -> None:
        print(f"🔄 Service updated: {name}")


def test_brother_mdns_discovery(timeout: float = 10.0):
    """
    Test the enhanced Brother QL-810W mDNS discovery system
    """
    print("🚀 Starting Brother QL-810W mDNS Discovery Test")
    print("=" * 60)
    print(f"⏱️  Discovery timeout: {timeout} seconds")
    print(f"📡 Scanning multicast addresses: 224.0.0.251:5353, ff02::fb:5353")
    print()

    zeroconf = Zeroconf()
    listener = BrotherQL810WListener()
    browsers = []

    # Brother QL-810W service types (as specified)
    service_types = [
        "_printer._tcp.local.",        # Generic network printer discovery
        "_pdl-datastream._tcp.local.", # Raw TCP printing (port 9100 protocol)
        "_ipp._tcp.local.",           # IPP printing
        "_brother._tcp.local."        # Brother-specific services
    ]

    try:
        print("🔍 Starting mDNS service browsers...")
        for service_type in service_types:
            try:
                browser = ServiceBrowser(zeroconf, service_type, listener)
                browsers.append(browser)
                print(f"   ✓ Browsing {service_type}")
            except Exception as e:
                print(f"   ✗ Failed to browse {service_type}: {e}")

        print(f"\n⏳ Listening for Brother QL-810W announcements...")
        print("   (QL-810W sends announcements ~1s initially, then ~120s)")
        
        # Wait and report progress
        start_time = time.time()
        while (time.time() - start_time) < timeout:
            time.sleep(1)
            elapsed = int(time.time() - start_time)
            found_count = len(listener.discovered_printers)
            
            if elapsed % 3 == 0:  # Update every 3 seconds
                print(f"   [{elapsed:2d}s] Found {found_count} Brother printers...")

        print(f"\n🎉 Discovery Complete!")
        print("=" * 60)

        # Results summary
        discovered = listener.discovered_printers
        if discovered:
            print(f"✅ Found {len(discovered)} Brother printer(s):")
            print()
            
            for i, printer in enumerate(discovered, 1):
                print(f"Printer #{i}:")
                print(f"  🖨️  Model: {printer['model']}")
                print(f"  📍 IP Address: {printer['ip']}:{printer['port']}")
                print(f"  🏭 Manufacturer: {printer['manufacturer']}")
                print(f"  🌐 Service Type: {printer['service_type']}")
                print(f"  🕐 Discovery Time: {printer['discovery_time']:.1f}s")
                
                if printer.get('mac'):
                    print(f"  🔗 MAC Address: {printer['mac']}")
                if printer.get('user_name'):
                    print(f"  👤 User Name: {printer['user_name']}")
                if printer.get('hostname'):
                    print(f"  🖥️  Hostname: {printer['hostname']}")
                
                print(f"  📝 TXT Records:")
                for key, value in printer['txt_records'].items():
                    print(f"     {key} = '{value}'")
                print()
        else:
            print("❌ No Brother printers found via mDNS")
            print()
            print("Troubleshooting tips:")
            print("• Ensure your QL-810W is connected to Wi-Fi (infrastructure mode)")
            print("• Check that the printer and computer are on the same network")
            print("• Verify mDNS/Bonjour is enabled on your network")
            print("• Try increasing the timeout (QL-810W announces every ~120s)")
            
    except KeyboardInterrupt:
        print("\n⚠️ Discovery interrupted by user")
    except Exception as e:
        print(f"\n❌ Discovery error: {e}")
    finally:
        print("\n🧹 Cleaning up...")
        for browser in browsers:
            try:
                browser.cancel()
            except:
                pass
        zeroconf.close()


if __name__ == "__main__":
    import sys
    
    # Allow custom timeout from command line
    timeout = 15.0
    if len(sys.argv) > 1:
        try:
            timeout = float(sys.argv[1])
        except ValueError:
            print(f"Invalid timeout '{sys.argv[1]}', using default {timeout}s")
    
    test_brother_mdns_discovery(timeout)