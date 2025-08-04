import os
import traceback
from datetime import datetime
from typing import List, Dict

import flask
import io
import base64
from label_bro.utils import printer_utils
from label_bro.utils import label_creation

app = flask.Flask(__name__)

LABEL_WIDTH = 696


@app.context_processor
def inject_common_data():
    return {
        'last_updated': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'app_name': 'Label Bro 😎',  # Example of additional common data
    }


@app.errorhandler(Exception)
def handle_exception(e):
    # Get the full stack trace
    stack_trace = traceback.format_exc()

    # Print stack trace to the console (optional)
    print(stack_trace)

    # Return a JSON response with the error message and stack trace
    response = {
        'error': str(e),
        'stack_trace': stack_trace
    }

    return flask.jsonify(response), 500


@app.route('/')
def index():
    return flask.render_template(
        'index.html',
        custom_message="Yo. I'm your label Bro. Fist bump Bro."
    )


@app.route('/printers', methods=['GET'])
def get_printers():
    """Get all available printers with their status and media info"""
    try:
        printers = printer_utils.discover_printers()
        return flask.jsonify({
            'printers': {
                printer_id: {
                    'id': printer_id,
                    'display_name': info.display_name,
                    'model': info.model_number,
                    'backend': info.backend,
                    'is_connected': info.is_connected,
                    'media_info': info.media_info
                }
                for printer_id, info in printers.items()
            }
        }), 200
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500


@app.route('/printers/discover', methods=['POST'])
def discover_printers():
    """Discover all printers including network auto-discovery"""
    try:
        printers = printer_utils.discover_all_printers()
        return flask.jsonify({
            'printers': {
                printer_id: {
                    'id': printer_id,
                    'display_name': info.display_name,
                    'model': info.model_number,
                    'backend': info.backend,
                    'is_connected': info.is_connected,
                    'media_info': info.media_info,
                    'identifier': info.identifier
                }
                for printer_id, info in printers.items()
            },
            'discovery_methods': {
                'snmp_broadcast': printer_utils.SNMP_AVAILABLE,
                'snmp_targeted': printer_utils.SNMP_AVAILABLE,
                'mdns': printer_utils.ZEROCONF_AVAILABLE,
                'network_scan': True,
                'usb': True
            }
        }), 200
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500


@app.route('/printers/test', methods=['POST'])
def test_manual_connection():
    """Test manual connection to IP address or subnet"""
    try:
        data = flask.request.json
        target = data.get('target', '').strip()
        
        if not target:
            return flask.jsonify({'error': 'No target specified'}), 400
        
        # Test the connection
        result = printer_utils.test_manual_connection(target)
        
        return flask.jsonify(result), 200
        
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500


@app.route('/printLabels', methods=['POST'])
def print_labels_endpoint():
    data = flask.request.json.get('data', {})
    text_content = data.get('text', '')
    should_print_full = data.get('shouldPrintFullLabel', True)
    should_print_small = data.get('shouldPrintSmallLabel', True)
    printer_id = data.get('printer_id')

    errors: List[str] = []

    if not text_content:
        return flask.jsonify({'error': 'Invalid input'}), 400

    if not printer_id:
        return flask.jsonify({'error': 'No printer selected. Please refresh and select a printer.'}), 400

    if not isinstance(should_print_full, bool) and not isinstance(should_print_small, bool):
        return flask.jsonify({'error': 'Invalid input. shouldPrintFullLabel and shouldPrintSmallLabel must be boolean values'}), 400

    # Verify printer exists in discovered printers
    try:
        printer_info = printer_utils.get_printer_info(printer_id)
        if not printer_info.is_connected:
            return flask.jsonify({'error': f'Printer {printer_info.display_name} is no longer available. Please refresh.'}), 500
    except ValueError as e:
        return flask.jsonify({'error': f'Selected printer not found. Please refresh and select again. ({str(e)})'}), 500

    lines = text_content.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue

        split_line = line.split(';')
        label_text = split_line[0]
        if len(split_line) > 1:
            repeat_times = int(split_line[1])
            if repeat_times > 5:
                errors.append(f"{repeat_times} labels? Too many!")
        else:
            repeat_times = 1

        for i in range(repeat_times):
            if should_print_full:
                status = label_creation.process_label(label_text, LABEL_WIDTH, 'full', printer_id)
                if status:
                    errors.append(str(status))

            if should_print_small:
                status = label_creation.process_label(label_text, LABEL_WIDTH, 'small', printer_id)
                if status:
                    errors.append(str(status))

    # check all the errors

    return flask.jsonify({'status': f'Label status: {status}'}), 200


@app.route('/previewLabels', methods=['POST'])
def preview_labels_endpoint():
    data = flask.request.json.get('data', {})
    text_content = data.get('text', '')
    should_print_full: bool = data.get('shouldPrintFullLabel', True)
    should_print_small: bool = data.get('shouldPrintSmallLabel', True)

    if not text_content:
        raise ValueError("Input is empty!")

    full_images = []
    small_images = []

    lines = text_content.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue

        split_line = line.split(';')
        label_text = split_line[0]

        if should_print_full:
            full_image, error = label_creation.create_full_width_label_image(label_text, LABEL_WIDTH)
            if error:
                raise error
            full_images.append(full_image)

        if should_print_small:
            small_image, error = label_creation.create_small_label_image(label_text, LABEL_WIDTH)
            if error:
                raise error
            small_images.append(small_image)

    full_labels_base64 = [label_creation.img_to_base64(img) for img in full_images]
    small_labels_base64 = [label_creation.img_to_base64(img) for img in small_images]

    return flask.jsonify({
        'full_labels': full_labels_base64,
        'small_labels': small_labels_base64
    }), 200


# AI generation routes removed - functionality not needed for multiple printer support

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5099, debug=True)
