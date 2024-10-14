import usb.core
import brother_ql.backends.helpers
from brother_ql.raster import BrotherQLRaster
from typing import Optional
import cairo
import io

PRINTER_IDENTIFIER = 'usb://0x04f9:0x209b'
LABEL_SIZE = '62'


def check_printer_connection() -> bool:
    dev = usb.core.find(idVendor=0x04f9, idProduct=0x209b)
    return dev is not None


def convert_image_to_instructions(surface: cairo.ImageSurface) -> Optional[bytes]:
    qlr = BrotherQLRaster('QL-800')
    qlr.exception_on_warning = True
    buffer = io.BytesIO()

    # Save the Cairo surface to the buffer as a BMP file
    surface.write_to_png(buffer)  # Cairo doesn't support BMP directly, so PNG is used instead
    buffer.seek(0)

    # Convert the image to instructions using the BrotherQLRaster object
    instructions = brother_ql.conversion.convert(
        qlr=qlr,
        images=[buffer],
        label=LABEL_SIZE,
        threshold=70.0
    )

    return instructions


def send_instructions(instructions: bytes) -> None:
    brother_ql.backends.helpers.send(instructions, PRINTER_IDENTIFIER)
