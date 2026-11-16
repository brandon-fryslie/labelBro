import socket

import pytest
import usb.core
from zeroconf import ServiceInfo

from label_bro.utils import printer_utils


def test_mdns_key_only_txt_entry_reads_as_empty():
    # b"ty" with no "=" is an RFC 6763 boolean attribute: zeroconf decodes its value to None.
    info = ServiceInfo(
        "_pdl-datastream._tcp.local.",
        "QL-810W._pdl-datastream._tcp.local.",
        addresses=[socket.inet_aton("192.168.1.50")],
        port=9100,
        properties={b"ty": None, b"usb_MDL": b"QL-810W", b"usb_MFG": b"Brother"},
    )

    printer = printer_utils.BrotherPrinterListener()._parse_brother_printer_info(info, info.type, info.name)

    assert printer is not None
    assert printer["model"] == "QL-810W"
    assert printer["txt_records"]["ty"] == ""


def test_usb_probe_without_libusb_reports_and_finds_nothing(monkeypatch, capsys):
    def no_backend(**_):
        raise usb.core.NoBackendError("No backend available")

    monkeypatch.setattr(usb.core, "find", no_backend)

    assert printer_utils.verify_usb_printer_available() is None
    assert "libusb not found" in capsys.readouterr().out


def test_subnet_test_surfaces_a_failed_printer_query(monkeypatch):
    monkeypatch.setattr(printer_utils, "discover_printers_snmp_targeted", lambda ranges, timeout: [{"ip": "10.0.0.5"}])

    def explode(ip, timeout):
        raise RuntimeError("status read fell over")

    monkeypatch.setattr(printer_utils, "get_printer_media_info", explode)

    with pytest.raises(RuntimeError, match="status read fell over"):
        printer_utils.test_manual_connection("10.0.0.0/29")
