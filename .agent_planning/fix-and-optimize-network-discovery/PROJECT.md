Relevant code from brother_ql lib:

#!/usr/bin/env python

"""
Backend to support Brother QL-series printers via network.
Works cross-platform.
"""

import socket, time, select

from .generic import BrotherQLBackendGeneric

def list_available_devices():
"""
List all available devices for the network backend

    returns: devices: a list of dictionaries with the keys 'identifier' and 'instance': \
        [ {'identifier': 'tcp://hostname[:port]', 'instance': None}, ] \
        Instance is set to None because we don't want to connect to the device here yet.
    """

    # We need some snmp request sent to 255.255.255.255 here
    raise NotImplementedError()
    return [{'identifier': 'tcp://' + path, 'instance': None} for path in paths]

class BrotherQLBackendNetwork(BrotherQLBackendGeneric):
"""
BrotherQL backend using the Linux Kernel USB Printer Device Handles
"""

    def __init__(self, device_specifier):
        """
        device_specifier: string or os.open(): identifier in the \
            format file:///dev/usb/lp0 or os.open() raw device handle.
        """

        self.read_timeout = 0.01
        # strategy : try_twice, select or socket_timeout
        self.strategy = 'socket_timeout'
        if isinstance(device_specifier, str):
            if device_specifier.startswith('tcp://'):
                device_specifier = device_specifier[6:]
            host, _, port = device_specifier.partition(':')
            if port:
                port = int(port)
            else:
                port = 9100
            #try:
            self.s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            self.s.connect((host, port))
            #except OSError as e:
            #    raise ValueError('Could not connect to the device.')
            if self.strategy == 'socket_timeout':
                self.s.settimeout(self.read_timeout)
            elif self.strategy == 'try_twice':
                self.s.settimeout(self.read_timeout)
            else:
                self.s.settimeout(0)

        elif isinstance(device_specifier, int):
            self.dev = device_specifier
        else:
            raise NotImplementedError('Currently the printer can be specified either via an appropriate string or via an os.open() handle.')

    def _write(self, data):
        self.s.settimeout(10)
        self.s.sendall(data)
        self.s.settimeout(self.read_timeout)

    def _read(self, length=32):
        if self.strategy in ('socket_timeout', 'try_twice'):
            if self.strategy == 'socket_timeout':
                tries = 1
            if self.strategy == 'try_twice':
                tries = 2
            for i in range(tries):
                try:
                    data = self.s.recv(length)
                    return data
                except socket.timeout:
                    pass
            return b''
        elif self.strategy == 'select':
            data = b''
            start = time.time()
            while (not data) and (time.time() - start < self.read_timeout):
                result, _, _ = select.select([self.s], [], [], 0)
                if self.s in result:
                    data += self.s.recv(length)
                if data: break
                time.sleep(0.001)
            return data
        else:
            raise NotImplementedError('Unknown strategy')

    def _dispose(self):
        self.s.shutdown(socket.SHUT_RDWR)
        self.s.close()

#!/usr/bin/env python

"""
Helpers for the subpackage brother_ql.backends

* device discovery
* printing
  """

import logging, time

from brother_ql.backends import backend_factory, guess_backend
from brother_ql.reader import interpret_response
from brother_ql.backends import BrotherQLBackendGeneric

logger = logging.getLogger(__name__)

def discover(backend_identifier='linux_kernel'):
if backend_identifier is None:
logger.info("Backend for discovery not specified, defaulting to linux_kernel.")
backend_identifier = "linux_kernel"
be = backend_factory(backend_identifier)
list_available_devices = be['list_available_devices']
BrotherQLBackend = be['backend_class']
available_devices = list_available_devices()
return available_devices

def send(instructions, printer_identifier=None, backend_identifier=None, blocking=True):
"""
Send instruction bytes to a printer.

    :param bytes instructions: The instructions to be sent to the printer.
    :param str printer_identifier: Identifier for the printer.
    :param str backend_identifier: Can enforce the use of a specific backend.
    :param bool blocking: Indicates whether the function call should block while waiting for the completion of the printing.
    """

    status = {
      'instructions_sent': True, # The instructions were sent to the printer.
      'outcome': 'unknown', # String description of the outcome of the sending operation like: 'unknown', 'sent', 'printed', 'error'
      'printer_state': None, # If the selected backend supports reading back the printer state, this key will contain it.
      'did_print': False, # If True, a print was produced. It defaults to False if the outcome is uncertain (due to a backend without read-back capability).
      'ready_for_next_job': False, # If True, the printer is ready to receive the next instructions. It defaults to False if the state is unknown.
    }
    selected_backend = None
    if backend_identifier:
        selected_backend = backend_identifier
    else:
        try:
            selected_backend = guess_backend(printer_identifier)
        except ValueError:
            logger.info("No backend stated. Selecting the default linux_kernel backend.")
            selected_backend = 'linux_kernel'

    be = backend_factory(selected_backend)
    list_available_devices = be['list_available_devices']
    BrotherQLBackend       = be['backend_class']

    printer = BrotherQLBackend(printer_identifier)

    start = time.time()
    logger.info('Sending instructions to the printer. Total: %d bytes.', len(instructions))
    printer.write(instructions)
    status['outcome'] = 'sent'

    if not blocking:
        return status
    if selected_backend == 'network':
        """ No need to wait for completion. The network backend doesn't support readback. """
        return status

    while time.time() - start < 10:
        data = printer.read()
        if not data:
            time.sleep(0.005)
            continue
        try:
            result = interpret_response(data)
        except ValueError:
            logger.error("TIME %.3f - Couln't understand response: %s", time.time()-start, data)
            continue
        status['printer_state'] = result
        logger.debug('TIME %.3f - result: %s', time.time()-start, result)
        if result['errors']:
            logger.error('Errors occured: %s', result['errors'])
            status['outcome'] = 'error'
            break
        if result['status_type'] == 'Printing completed':
            status['did_print'] = True
            status['outcome'] = 'printed'
        if result['status_type'] == 'Phase change' and result['phase_type'] == 'Waiting to receive':
            status['ready_for_next_job'] = True
        if status['did_print'] and status['ready_for_next_job']:
            break

    if not status['did_print']:
        logger.warning("'printing completed' status not received.")
    if not status['ready_for_next_job']:
        logger.warning("'waiting to receive' status not received.")
    if (not status['did_print']) or (not status['ready_for_next_job']):
        logger.warning('Printing potentially not successful?')
    if status['did_print'] and status['ready_for_next_job']:
        logger.info("Printing was successful. Waiting for the next job.")

    return status

def get_printer(
printer_identifier=None,
backend_identifier=None,
):
"""
Instantiate a printer object for communication. Only bidirectional transport backends are supported.

    :param str printer_identifier: Identifier for the printer.
    :param str backend_identifier: Can enforce the use of a specific backend.
    """

    selected_backend = None
    if backend_identifier:
        selected_backend = backend_identifier
    else:
        try:
            selected_backend = guess_backend(printer_identifier)
        except ValueError:
            logger.info("No backend stated. Selecting the default linux_kernel backend.")
            selected_backend = "linux_kernel"
    if selected_backend == "network":
        # Not implemented due to lack of an available test device
        raise NotImplementedError

    be = backend_factory(selected_backend)
    BrotherQLBackend = be["backend_class"]
    printer = BrotherQLBackend(printer_identifier)
    return printer

def get_status(
printer,
receive_only=False,
target_status=None,
):
"""
Get printer status.

    :param BrotherQLBackendGeneric printer: A printer instance.
    :param bool receive_only: Don't send the status request command.
    :param int target_status: Expected status code.
    """

    if not receive_only:
        printer.write(b"\x1b\x69\x53")  # "ESC i S" Status information request
    data = printer.read()
    try:
        result = interpret_response(data)
    except ValueError:
        logger.error("Failed to parse response data: %s", data)
    if target_status is not None:
        if result['status_code'] != target_status:
            raise ValueError(f"Printer reported 0x{result['status_code']:02x} status instead of 0x{target_status:02x}")
    return result

def get_setting(
printer: BrotherQLBackendGeneric,
setting: int,
payload: bytes = None,
):
"""
Get setting from printer.

    :param BrotherQLBackendGeneric printer: A printer instance.
    :param int setting: The code for the setting.
    :param bytes payload: Optional additional payload, usually not required.
    """

    # ensure printer is free of errors before proceeding
    get_status(printer, target_status=0x0)
    # switch to raster command mode
    printer.write(b"\x1b\x69\x61\x01")
    # send command
    # 0x1b 0x69 0x55 setting
    # u8 setting
    # 0x01 read
    # optional extra payload
    command = b"\x1b\x69\x55" + setting.to_bytes(1, "big") + b"\x01"
    if payload is not None:
        command += payload
    printer.write(command)
    result = get_status(printer, receive_only=True, target_status=0xF0)
    return result

def write_setting(
printer: BrotherQLBackendGeneric,
setting: int,
payload: bytes,
):
"""
Write setting to printer.

    :param BrotherQLBackendGeneric printer: A printer instance.
    :param int setting: The code for the setting.
    :param bytes payload: Payload for the setting.
    """

    # switch to raster command mode
    printer.write(b"\x1b\x69\x61\x01")
    # write settings
    # 0x1b 0x69 0x55 setting
    # u8 setting
    # 0x0 write
    # payload (size dependent on setting and machine series)
    command = b"\x1b\x69\x55" + setting.to_bytes(1, 'big') + b"\x00"
    command += payload
    printer.write(command)
    # retrieve status to make sure no errors occured
    result = get_status(printer)
    if result['status_code'] != 0x0:
        raise ValueError("Failed to modify settings")
    return result

def configure(
printer_identifier=None,
backend_identifier=None,
action="get",
key=None,
value=None,
):
"""
Read or modify power settings.

    :param str printer_identifier: Identifier for the printer
    :param str backend_identifier: Can enforce the use of a specific backend
    :param str action: Action to perform, get or set
    :param str key: Key name for the settings
    :param int value: Value to update for the specified key
    """

    printer=get_printer(printer_identifier, backend_identifier)

    if action not in ['get', 'set']:
        raise ValueError(f"Invalid action '{action}'")
    if key not in ['power-off-delay', 'auto-power-on']:
        raise ValueError(f"Invalid key '{key}'")
    if action == 'set':
        if value is None:
            raise ValueError(f"Specify a valid value for key '{key}'")

    series_code = get_status(printer, target_status=0x0)['series_code']

    if action == 'set':
        if key == 'auto-power-on':
            payload = value.to_bytes(1, "big")
            write_setting(printer, 0x70, payload)
            get_status(printer, 0x0)
        elif key == 'power-off-delay':
            payload = b''
            # 0x30 series needs an extra byte here
            if series_code == 0x30:
                payload += b"\x00"
            payload += value.to_bytes(1, "big")
            write_setting(printer, 0x41, payload)
            get_status(printer, 0x0)
        else:
            raise ValueError(f"Key {key} is invalid")

    # retrieve settings
    retrieved_val = None
    if key == 'auto-power-on':
        retrieved_val = get_setting(printer, 0x70)['setting']
    elif key == 'power-off-delay':
        payload = b''
        # 0x30 series needs an extra byte here
        if series_code == 0x30:
            payload += b"\x00"
        retrieved_val = get_setting(printer, 0x41, payload)['setting']
    else:
        raise ValueError(f"Key {key} is invalid")

    logger.info(f"{key}: {retrieved_val}")
    return retrieved_val

import logging

logger = logging.getLogger(__name__)

def list_available_devices(ums_warning=True):
""" List all available devices for the respective backend """

# returns a list of dictionaries with the keys 'identifier' and 'instance':

# [ {'identifier': '/dev/usb/lp0', 'instance': os.open('/dev/usb/lp0', os.O_RDWR)}, ]

raise NotImplementedError()

class BrotherQLBackendGeneric(object):

    def __init__(self, device_specifier):
        """
        device_specifier can be either a string or an instance
        of the required class type.
        """
        self.write_dev = None
        self.read_dev  = None
        raise NotImplementedError()

    def _write(self, data):
        self.write_dev.write(data)

    def _read(self, length=32):
        return bytes(self.read_dev.read(length))

    def write(self, data):
        logger.debug('Writing %d bytes.', len(data))
        self._write(data)

    def read(self, length=32):
        try:
            ret_bytes = self._read(length)
            if ret_bytes: logger.debug('Read %d bytes.', len(ret_bytes))
            return ret_bytes
        except Exception as e:
            logger.debug('Error reading... %s', e)
            raise

    def dispose(self):
        try:
            self._dispose()
        except Exception:
            pass

    def _dispose(self):
        raise NotImplementedError()

    def __del__(self):
        self.dispose()

## technical details for autodisocverd

The Brother QL‑810W supports automatic discovery through a mix of industry‑standard protocols and Brother‑specific
extensions, depending on whether it’s connected via Wi‑Fi Direct, a local Wi‑Fi network, or USB.
The Brother mobile and desktop apps detect the printer without manual IP entry by using these mechanisms:

⸻

1. Networking Modes

The QL‑810W can run in one of three networking configurations, each affecting how discovery works:

1. Infrastructure Mode (Wi‑Fi to LAN/WLAN)
   • Printer joins the same Wi‑Fi network as the client device.
   • Discovery is via multicast service advertisements.
2. Wi‑Fi Direct Mode
   • Printer itself acts as a Wi‑Fi access point.
   • Client device connects directly.
   • Discovery is trivial because there is no intermediate network layer — the app queries a fixed service address over
   the Wi‑Fi Direct link.
3. USB Connection
   • No discovery step needed — USB device enumeration is handled by the OS.

⸻

2. Discovery Protocols Used

a. mDNS / Bonjour (Multicast DNS)
• The QL‑810W runs an mDNS responder that advertises its presence to 224.0.0.251 (IPv4) or ff02::fb (IPv6) on port
5353/UDP.
• Service type:
•    _printer._tcp.local (standard IPP printing service)
•    _pdl-datastream._tcp.local (raw socket printing, usually port 9100)
• Brother may also advertise _ipp._tcp.local with TXT records including:
• Model name (QL-810W)
• Supported languages (pcl, brother, raster)
• Serial number
• MAC address
• The Brother app sends a multicast query for these service types and lists all responses.

⸻

b. DNS‑SD (DNS Service Discovery)
• mDNS is paired with DNS‑SD to enumerate service instances and retrieve metadata.
• The Brother app can parse TXT records to:
• Verify the printer model is supported.
• Retrieve the printer’s hostname for direct socket connection.

⸻

c. SSDP / UPnP (Simple Service Discovery Protocol)
• Some Brother firmware also supports SSDP announcements:
• Multicast to 239.255.255.250:1900/UDP.
• Announces itself as a urn:schemas-upnp-org:device:Printer:1.
• SSDP is less common in Brother’s newer mobile workflow but can be present for backward compatibility with Windows.

⸻

d. Proprietary Brother Broadcast Discovery
• Brother also implements a lightweight UDP broadcast discovery on port 54925 (varies by firmware).
• The Brother app sends a broadcast packet like:

{BHLQ-1.0}<DISCOVERY>

or similar signature.

	•	Printers on the LAN respond unicast with:
	•	Model name
	•	IP address
	•	MAC address
	•	Firmware version
	•	This method is faster than mDNS because it doesn’t require service parsing and is used primarily by Brother’s own apps.

⸻

e. Wi‑Fi Direct Special Case
• In Wi‑Fi Direct mode, the printer assigns itself a static IP (usually 192.168.223.1).
• The Brother app knows this and directly attempts to open a TCP/UDP connection to known discovery ports.
• No multicast is needed — the app simply queries the known address.

⸻

3. App Behavior

When you launch the Brother app:

1. LAN/WLAN — Sends out mDNS queries → collects _printer._tcp.local responses → optionally sends proprietary UDP
   broadcast for faster filtering.
2. Wi‑Fi Direct — Attempts to connect to 192.168.223.1 and probe discovery ports.
3. Fallback — Uses SSDP if mDNS fails (mainly on Windows).
4. Verification — App sends a short status query to the printer’s proprietary control port to confirm it’s a QL‑810W and
   not another device.

⸻

If you want, I can diagram the full discovery packet flow for the QL‑810W showing each multicast/broadcast step and the
response format used by Brother’s apps. That would make it crystal clear how it works in each network mode.

here it is:

Got it — if your Brother QL‑810W and your computer are both on your home Wi‑Fi (infrastructure mode), you only need to
handle mDNS/DNS‑SD and optionally Brother’s proprietary UDP broadcast.

Here’s the technical breakdown and Python implementation for that case.

⸻

1. Technical Flow in Home Wi‑Fi

When the printer is on your home network:

1. mDNS/DNS‑SD Discovery
   • Printer listens/responds on UDP port 5353 (multicast: 224.0.0.251).
   • Service types you can query:
   •    _printer._tcp.local
   •    _pdl-datastream._tcp.local (raw port 9100)
   •    _ipp._tcp.local (IPP printing)
   • TXT records include:
   • ty=Brother QL-810W
   • note=...
   • mac=...
   • product=...
2. Optional: Brother UDP Broadcast
   • Broadcast to your LAN broadcast address (e.g., 192.168.1.255) on a fixed port (commonly 54925).
   • Send a short ASCII probe like:

{BHLQ-1.0}<DISCOVERY>

	•	Printer responds unicast with model, IP, firmware.

⸻

2. Python Implementation — mDNS/DNS‑SD (Recommended)

Using zeroconf:

from zeroconf import Zeroconf, ServiceBrowser

class BrotherListener:
def add_service(self, zeroconf, service_type, name):
info = zeroconf.get_service_info(service_type, name)
if info:
model = info.properties.get(b'ty', b'').decode('utf-8')
if "QL-810W" in model:
ip = info.parsed_addresses()[0]
print(f"[mDNS] Brother QL-810W found at {ip} ({model})")

zeroconf = Zeroconf()
listener = BrotherListener()

# Monitor both generic and raw socket printer service types

ServiceBrowser(zeroconf, "_printer._tcp.local.", listener)
ServiceBrowser(zeroconf, "_pdl-datastream._tcp.local.", listener)

try:
input("Press Enter to stop...\n")
finally:
zeroconf.close()

⸻

3. Python Implementation — Brother UDP Broadcast (Faster, Proprietary)

import socket

BROADCAST_PORT = 54925 # Brother discovery port (may vary by model/firmware)
DISCOVERY_MESSAGE = b"{BHLQ-1.0}<DISCOVERY>"

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
sock.settimeout(2)

# Send to broadcast address of your network

sock.sendto(DISCOVERY_MESSAGE, ("255.255.255.255", BROADCAST_PORT))

try:
while True:
data, addr = sock.recvfrom(1024)
if b"QL-810W" in data:
print(f"[Brother UDP] Found QL-810W at {addr[0]}: {data.decode(errors='ignore')}")
except socket.timeout:
pass

⸻

4. Recommendation
   • mDNS/DNS‑SD: Works on any network where multicast is allowed. Slower (1–3s typical).
   • Brother UDP Broadcast: Much faster (<500ms), but requires knowing the port and packet format. Not officially
   documented, but easy to reverse‑engineer.

⸻

If you want, I can give you a single Python script that combines both mDNS and Brother UDP broadcast discovery so you
get instant results if broadcast works but still fall back to mDNS if it doesn’t.
That’s the most robust approach.

Do you want me to do that next?
