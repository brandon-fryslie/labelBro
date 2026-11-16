# Enhanced mDNS Discovery for Brother QL Printers

This document describes the enhanced mDNS/Bonjour discovery implementation for Brother QL-810W and other Brother QL series printers, based on detailed protocol analysis and TXT record parsing.

## Overview

Brother QL-810W printers connected to Wi-Fi in infrastructure mode advertise themselves using mDNS/DNS-SD with predictable service types and TXT record patterns. This implementation leverages those patterns for reliable discovery.

## mDNS Advertisement Details

### Service Types
Brother QL printers advertise on these service types:
```
_printer._tcp.local.        # Generic network printer discovery
_pdl-datastream._tcp.local. # Raw TCP printing (port 9100 protocol)
_ipp._tcp.local.           # IPP printing (port 631)
_brother._tcp.local.       # Brother-specific services (if available)
```

### Multicast Addresses
- **IPv4**: `224.0.0.251:5353`
- **IPv6**: `ff02::fb:5353`
- **Transport**: UDP
- **Announcement Interval**: ~1s initially, then ~120s

### TXT Record Fields
Key TXT records used for Brother printer identification:

| Field | Description | Example |
|-------|-------------|---------|
| `ty` | Model name | `Brother QL-810W` |
| `product` | Product identifier | `(Brother QL-810W)` |
| `usb_MFG` | USB manufacturer | `Brother` |
| `usb_MDL` | USB model | `QL-810W` |
| `note` | User-assigned name | `Office Printer` |
| `mac` | MAC address | `AB:CD:EF:12:34:56` |
| `UUID` | Unique identifier | `...` |

## Implementation

### Enhanced BrotherPrinterListener

```python
class BrotherPrinterListener(ServiceListener):
    """Enhanced mDNS service listener using TXT record analysis"""
    
    def _parse_brother_printer_info(self, info, service_type, name):
        """Parse Brother printer info from mDNS service using TXT records"""
        properties = info.properties if info.properties else {}
        
        # Extract model from TXT records
        model = self._extract_model_from_txt(properties)
        manufacturer = self._extract_manufacturer_from_txt(properties)
        
        # Verify this is a Brother printer
        if not self._is_brother_printer(model, manufacturer, name):
            return None
            
        # Build comprehensive printer info...
```

### Model Extraction Strategy

The implementation tries multiple TXT record fields in order of reliability:

1. **`ty` field** (most reliable): `Brother QL-810W`
2. **`product` field**: `(QL-810W)`  
3. **`usb_MDL` field**: `QL-810W`

### Brother Printer Identification

Strict criteria to avoid false positives:

```python
def _is_brother_printer(self, model, manufacturer, service_name):
    # Primary: Model contains both "Brother" and "QL-"
    if model and "Brother" in model and "QL-" in model.upper():
        return True

    # Secondary: Model has QL- AND manufacturer is Brother
    if model and "QL-" in model.upper() and manufacturer == "Brother":
        return True

    # Reject non-Brother manufacturers
    if manufacturer and manufacturer not in ["Brother", "Unknown"]:
        return False
```

### Deduplication

Prevents duplicate entries when the same printer is found via multiple service types:

```python
# Check for duplicates (same IP and model)
for existing in self.discovered_printers:
    if existing["ip"] == ip and existing["model"] == model:
        # Update service types but don't duplicate
        existing.setdefault("service_types", []).append(type_)
        return
```

## Discovery Results

The enhanced discovery provides comprehensive printer information:

```python
{
    "ip": "192.168.7.26",
    "port": 631,
    "model": "Brother QL-800 CUPS",
    "manufacturer": "Brother",
    "mac_address": "AB:CD:EF:12:34:56",
    "user_name": "Office Printer",
    "service_type": "_ipp._tcp.local.",
    "service_types": ["_ipp._tcp.local.", "_printer._tcp.local."],
    "discovery_method": "mDNS_TXT",
    "hostname": "printer.local.",
    "txt_records": {...},  # Full TXT record dump
}
```

## Usage

### Basic Discovery
```python
from label_bro.utils.printer_utils import discover_network_printers_mdns

discovered = discover_network_printers_mdns(timeout=5.0)
for printer in discovered:
    print(f"Found: {printer['model']} at {printer['ip']}")
```

### Standalone Testing
```bash
# Test the enhanced mDNS discovery
python3 test-mdns-discovery.py 10

# Verbose output with TXT record analysis
python3 test-mdns-discovery.py 15
```

## Integration with Main Discovery

The enhanced mDNS discovery is integrated into the main autodiscovery hierarchy:

1. **SNMP Broadcast Discovery** (Phase 1)
2. **SNMP Targeted Discovery** (Phase 2) 
3. **Enhanced mDNS Discovery** (Phase 3) ← **Now using TXT records**
4. **Network Port Scanning** (Phase 4)

## Advantages over Previous Implementation

### Before (Name-based)
```python
# Old approach: unreliable name parsing
if "brother" in name.lower() or "bro" in name.lower():
    model = self._extract_model_from_name(name)  # Guessing
```

### After (TXT Record-based)
```python
# New approach: protocol-compliant TXT record parsing
model = properties.get(b"ty", b"").decode("utf-8")  # Official field
if model and "QL-810W" in model:
    return True  # Reliable identification
```

### Key Improvements

1. **Protocol Compliance**: Uses official mDNS/DNS-SD TXT record fields
2. **Reliability**: Exact model identification from `ty` field
3. **Comprehensive**: Extracts manufacturer, MAC, user name, etc.
4. **Deduplication**: Handles same printer on multiple service types
5. **False Positive Prevention**: Strict Brother-specific identification
6. **Rich Metadata**: Full TXT record capture for debugging

## Testing Results

Example successful discovery output:
```
✅ Found 1 Brother printer(s):

Printer #1:
  🖨️  Model: Brother QL-800 CUPS
  📍 IP Address: 192.168.7.26:631
  🏭 Manufacturer: Brother
  🌐 Service Type: _ipp._tcp.local.
  👤 User Name: potato
  🖥️  Hostname: potato.local.
  📝 TXT Records: ty=Brother QL-800 CUPS, product=(QL-800), ...
```

## Protocol Compliance

This implementation follows the Brother QL-810W mDNS advertisement specification:
- ✅ Monitors correct multicast addresses
- ✅ Parses all documented service types  
- ✅ Uses official TXT record fields (`ty`, `usb_MDL`, etc.)
- ✅ Handles announcement timing (1s initial, 120s maintenance)
- ✅ Provides reliable Brother QL series identification

The enhanced mDNS discovery makes Brother QL printer detection significantly more reliable and protocol-compliant compared to the previous name-based approach.