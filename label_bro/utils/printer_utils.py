import dataclasses

import usb.core
import brother_ql.backends.helpers
from brother_ql.raster import BrotherQLRaster
from typing import Optional
import cairo
import io

LABEL_SIZE = '62'

@dataclasses.dataclass
class PrinterInfo:
    identifier: str
    model_number: str
    label_size: str
    backend: str

def get_printer_info(printer_name: str='LabelBroWired') -> PrinterInfo:
    # TODO: fix this function to handle printer selection when implemented
    # Remove default value
    if printer_name == 'LabelBroWired':
        return PrinterInfo(
            identifier='usb://0x04f9:0x209b',
            model_number="QL-800",
            label_size="62",
            backend="usb",
        )
    elif printer_name == 'LabelBroWireless':
        return PrinterInfo(
            identifier="tcp://192.168.7.150:9100",
            model_number="QL-810W",
            label_size="62x100",
            backend="network",
        )
    else:
        raise ValueError(f'Unknown printer name: {printer_name}')

def check_printer_connection() -> bool:
    # TODO: fix this function to handle multiple printers
    if get_printer_info().backend == "usb":
        dev = usb.core.find(idVendor=0x04f9, idProduct=0x209b)
        return dev is not None
    else:
        # todo: add a check or something
        return True


def convert_image_to_instructions(surface: cairo.ImageSurface) -> Optional[bytes]:
    printer_info = get_printer_info()
    qlr = BrotherQLRaster(printer_info.model_number)
    qlr.exception_on_warning = True
    buffer = io.BytesIO()

    # Save the Cairo surface to the buffer as a BMP file
    surface.write_to_png(buffer)  # Cairo doesn't support BMP directly, so PNG is used instead
    buffer.seek(0)

    # Convert the image to instructions using the BrotherQLRaster object
    instructions = brother_ql.conversion.convert(
        qlr=qlr,
        images=[buffer],
        # TODO: fix this to handle non-continuous-roll label sizes
        label=printer_info.label_size,
        threshold=70.0
    )

    return instructions


def send_instructions(instructions: bytes) -> dict:
    # TODO: fix this function to handle multiple printers
    return brother_ql.backends.helpers.send(instructions, get_printer_info().identifier)
