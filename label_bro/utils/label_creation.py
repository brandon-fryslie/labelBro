import base64
import io
from typing import Optional, Tuple

import cairo

from label_bro.utils import printer_utils


def create_full_width_label_image(text: str, width: int) -> Tuple[Optional[cairo.ImageSurface], Optional[Exception]]:
    padding = 20
    vertical_padding = 20  # Padding for top and bottom
    line_spacing = 40  # Additional padding between lines

    # Split the text into words, each on a new line
    words = text.split()

    # Load the font
    font_face = "Impact"

    # Initialize variables for dynamic font size calculation
    font_size = 10
    total_height = 0
    label_height = 1000  # Initial guess for height to accommodate multiple font sizes

    # Initialize total_text_height with None to detect if it was never properly set
    total_text_height = None

    # Calculate the optimal font size
    for size in range(10, 300):  # Assuming the max font size won't exceed 300
        # Create a temporary surface to measure text
        temp_surface = cairo.ImageSurface(cairo.FORMAT_RGB24, width, label_height)
        temp_context = cairo.Context(temp_surface)
        temp_context.select_font_face(font_face, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
        temp_context.set_font_size(size)

        # Measure the maximum width of any word
        max_text_width = 0
        total_text_height = 0  # Reset total_text_height for this iteration
        for word in words:
            x_bearing, y_bearing, text_width, text_height, x_advance, y_advance = temp_context.text_extents(word)
            max_text_width = max(max_text_width, text_width)
            total_text_height += text_height + line_spacing  # Add line spacing between lines

        # Check if the text width exceeds the label width or if the total height becomes too large
        if max_text_width > width - 2 * padding or total_text_height > label_height - 2 * vertical_padding:
            break
        else:
            font_size = size
            total_height = total_text_height + 2 * vertical_padding  # Including padding

    # If total_text_height was never properly set, throw an error
    if total_text_height is None or total_text_height == 0:
        return None, ValueError("Failed to calculate text height. The provided text may not be suitable for the given width.")

    # Round to int
    total_height = int(total_height)

    # Create the final surface to draw on with the calculated total height
    surface = cairo.ImageSurface(cairo.FORMAT_RGB24, width, total_height)
    context = cairo.Context(surface)

    # Set the background to white
    context.set_source_rgb(1, 1, 1)
    context.paint()

    # Set the font with the calculated optimal font size
    context.select_font_face(font_face, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
    context.set_font_size(font_size)

    # Calculate the starting y position to vertically center the text
    y = (total_height - (total_text_height - line_spacing)) / 2 + vertical_padding

    # Draw the text centered vertically
    for word in words:
        x_bearing, y_bearing, text_width, text_height, x_advance, y_advance = context.text_extents(word)
        x = (width - text_width) / 2
        context.move_to(x, y + text_height)
        context.set_source_rgb(0, 0, 0)  # Set text color to black
        context.show_text(word)
        y += text_height + line_spacing  # Add line spacing after each line

    return surface, None


import cairo
from typing import Tuple, Optional

import cairo
from typing import Tuple, Optional


def create_small_label_image(text: str, width: int) -> Tuple[Optional[cairo.ImageSurface], Optional[Exception]]:
    initial_font_size = 100
    left_padding = 10  # Left padding as a variable
    vertical_padding = 10  # Vertical padding for both top and bottom
    min_font_size = 10  # Minimum font size to avoid overly small text

    # Create a temporary surface to measure the text
    temp_surface = cairo.ImageSurface(cairo.FORMAT_RGB24, width, 1000)  # Height is arbitrary for measurement
    temp_context = cairo.Context(temp_surface)

    # Load the font
    font_face = "Impact"
    temp_context.select_font_face(font_face, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)

    # Dynamically adjust the font size to fit the text within the width
    font_size = initial_font_size
    temp_context.set_font_size(font_size)
    text_extents = temp_context.text_extents(text)

    while text_extents.width > (width - 2 * left_padding) and font_size > min_font_size:
        font_size -= 2
        temp_context.set_font_size(font_size)
        text_extents = temp_context.text_extents(text)

    # Calculate the total height required, including vertical padding
    total_height = int(text_extents.height + 2 * vertical_padding)

    # Calculate the vertical position to center the text
    y = (total_height - text_extents.height) / 2 - text_extents.y_bearing

    # Create the final surface and context with the correct height
    surface = cairo.ImageSurface(cairo.FORMAT_RGB24, width, total_height)
    context = cairo.Context(surface)

    # Set the background to white
    context.set_source_rgb(1, 1, 1)
    context.paint()

    # Set the font with the calculated optimal font size
    context.select_font_face(font_face, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
    context.set_font_size(font_size)

    # Draw the text centered vertically
    context.move_to(left_padding, y)
    context.set_source_rgb(0, 0, 0)  # Set text color to black
    context.show_text(text)
    context.stroke()

    # Return the surface
    return surface, None


# Two label types: small and full (small = single line, full = full width)
def process_label(text: str, width: int, label_type: str) -> Optional[Exception]:
    if label_type == 'full':
        image, error = create_full_width_label_image(text, width)
    else:
        image, error = create_small_label_image(text, width)

    if error:
        return error

    instructions = printer_utils.convert_image_to_instructions(image)
    printer_utils.send_instructions(instructions)
    return None


def img_to_base64(surface: cairo.ImageSurface) -> str:
    buffer = io.BytesIO()
    surface.write_to_png(buffer)
    buffer.seek(0)
    img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f'data:image/png;base64,{img_str}'


def str_to_bool(s: str) -> bool:
    truthy = ['true', '1', 'yes', 'y', 'on']
    falsy = ['false', '0', 'no', 'n', 'off']
    lower_s = s.lower()
    if lower_s in truthy:
        return True
    if lower_s in falsy:
        return False

    raise ValueError(f"Invalid value {s}")
