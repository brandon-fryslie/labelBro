import os
import sys
import socket
import logging
import time
from datetime import datetime
from typing import List, Dict
import threading

import flask
from werkzeug.exceptions import HTTPException
import io
import base64
from label_bro.utils import printer_utils
from label_bro.utils import label_creation

app = flask.Flask(__name__)
app.logger.setLevel(logging.INFO)

LABEL_WIDTH = 696

# Background autodiscovery on server startup
def run_startup_autodiscovery():
    """Run printer autodiscovery in background on server startup"""
    app.logger.info("Starting background printer autodiscovery")
    try:
        discovered = printer_utils.discover_all_printers()
    except Exception:
        # [LAW:no-silent-failure] the thread's top level: the trace goes to the server log.
        app.logger.exception("Startup autodiscovery failed")
        return
    app.logger.info("Startup autodiscovery complete: %d printers found", len(discovered))
    for printer_id, printer_info in discovered.items():
        app.logger.info("  - %s: %s (%s)", printer_id, printer_info.model_number, printer_info.backend)



@app.context_processor
def inject_common_data():
    return {
        'last_updated': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'app_name': 'Label Bro 😎',  # Example of additional common data
    }


@app.before_request
def start_request_clock():
    flask.g.request_started = time.perf_counter()


@app.after_request
def log_request(response):
    # [LAW:nothing-unseen] one event per request, emitted in the layer every request passes through.
    duration_ms = (time.perf_counter() - flask.g.request_started) * 1000
    app.logger.info("%s %s %d %.1fms", flask.request.method, flask.request.path, response.status_code, duration_ms)
    return response


@app.errorhandler(Exception)
def handle_exception(e):
    # HTTP errors (400, 404, 405, ...) keep their status and headers (Allow, ...);
    # only the body becomes JSON, because the frontend reads every response as JSON.
    if isinstance(e, HTTPException):
        response = e.get_response()
        response.data = flask.json.dumps({'error': e.description})
        response.content_type = 'application/json'
        return response
    # [LAW:no-silent-failure] the trace goes to the server log; clients on the LAN get the message only.
    app.logger.exception("Unhandled error serving %s %s", flask.request.method, flask.request.path)
    return flask.jsonify({'error': str(e)}), 500


@app.route('/')
def index():
    return flask.render_template(
        'index.html',
        custom_message="Yo. I'm your label Bro. Fist bump Bro."
    )


@app.route('/printers', methods=['GET'])
def get_printers():
    """Get cached printers from startup autodiscovery without re-running discovery"""
    # Use the global printer registry populated at startup
    from label_bro.utils.printer_utils import _discovered_printers

    return flask.jsonify({
        'printers': {
            printer_id: {
                'id': printer_id,
                'display_name': info.display_name,
                'model_number': info.model_number,
                'backend': info.backend,
                'is_connected': info.is_connected,
                'media_info': info.media_info,
                'identifier': info.identifier
            }
            for printer_id, info in _discovered_printers.items()
        }
    }), 200


@app.route('/printers/discover', methods=['POST'])
def discover_printers():
    """Discover all printers including network auto-discovery"""
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
            'snmp_broadcast': True,  # quicksnmp module available
            'snmp_targeted': True,   # quicksnmp module available
            'mdns': True,           # zeroconf module available
            'network_scan': True,   # built-in socket scanning
            'usb': True            # brother_ql USB support
        }
    }), 200


@app.route('/printers/test', methods=['POST'])
def test_manual_connection():
    """Test manual connection to IP address or subnet and add successful connections to registry"""
    data = flask.request.json
    target = data.get('target', '').strip()

    if not target:
        return flask.jsonify({'error': 'No target specified'}), 400

    # Test the connection
    result = printer_utils.test_manual_connection(target)

    # If successful and found valid printers, add them to the registry
    if result.get('success') and result.get('printers_found'):
        from label_bro.utils.printer_utils import _discovered_printers, PrinterInfo

        for printer in result['printers_found']:
            # Only add printers that are ready (media loaded and printer ready)
            if printer.get('media_loaded') and printer.get('printer_ready'):
                printer_id = f"manual_{printer['ip'].replace('.', '_')}"

                # Create PrinterInfo object for the manual printer
                printer_info = PrinterInfo(
                    identifier=f"tcp://{printer['ip']}:9100",
                    model_number=printer['model'],
                    label_size=printer.get('media_width', '62mm').replace('mm', ''),
                    backend="network",
                    display_name=f"{printer['model']} at {printer['ip']} (Manual)",
                    is_connected=True,
                    media_info=f"{printer.get('media_width', '62mm')} {printer.get('media_type', 'labels')} (ready)"
                )

                # Add to discovered printers registry
                _discovered_printers[printer_id] = printer_info
                app.logger.info("Added manual printer to registry: %s", printer_id)

    return flask.jsonify(result), 200


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


@app.route('/log-frontend-error', methods=['POST'])
def log_frontend_error():
    """Endpoint for frontend to send TypeScript/validation errors to backend for centralized logging"""
    data = flask.request.get_json()

    if not data:
        return flask.jsonify({'error': 'No data provided'}), 400

    error_type = data.get('type', 'FRONTEND_ERROR')
    error_message = data.get('message', 'Unknown error')
    error_details = data.get('details', {})
    timestamp = data.get('timestamp', datetime.now().isoformat())
    source = data.get('source', 'frontend')

    # Format error for stderr logging
    formatted_error = f"""
╭─────────────────────────────────────────────────────────────────╮
│ 🚨 FRONTEND ERROR LOGGED TO BACKEND                            │
├─────────────────────────────────────────────────────────────────┤
│ Type:      {error_type:<50} │
│ Source:    {source:<50} │
│ Time:      {timestamp:<50} │
│ Message:   {error_message[:50]:<50} │
├─────────────────────────────────────────────────────────────────┤
│ Details:                                                        │
│ {str(error_details)[:65]:<65} │
╰─────────────────────────────────────────────────────────────────╯
    """

    # Log to stderr for visibility
    print(formatted_error, file=sys.stderr, flush=True)

    # Also log via the regular print for console visibility
    print(f"[FRONTEND_ERROR] {error_type}: {error_message}", flush=True)

    # Log details if they contain validation errors (for AI feedback)
    if 'validationErrors' in error_details:
        validation_summary = f"[VALIDATION_FAILURE] {len(error_details['validationErrors'])} validation errors detected"
        print(validation_summary, file=sys.stderr, flush=True)

        # Log first few validation errors for debugging
        for i, error in enumerate(error_details['validationErrors'][:3]):
            error_line = f"  [{i+1}] Path: {error.get('path', 'unknown')} | Expected: {error.get('expected', 'unknown')} | Got: {str(error.get('value', 'unknown'))[:30]}"
            print(error_line, file=sys.stderr, flush=True)

        if len(error_details['validationErrors']) > 3:
            print(f"  ... and {len(error_details['validationErrors']) - 3} more validation errors", file=sys.stderr, flush=True)

    return flask.jsonify({
        'status': 'logged',
        'message': 'Error logged to backend successfully'
    }), 200


# AI generation routes removed - functionality not needed for multiple printer support

def find_available_port(start_port=5099, max_attempts=100):
    """Find an available port starting from start_port; raise if the whole range is taken"""
    for port in range(start_port, start_port + max_attempts):
        try:
            # Create a socket and try to bind to the port
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.bind(('0.0.0.0', port))
                return port
        except OSError:
            # Port is in use, try the next one
            continue

    # [LAW:no-silent-failure] phones on the LAN need a predictable port, so a random one is no fallback.
    raise RuntimeError(f"No free port in {start_port}-{start_port + max_attempts - 1}")

if __name__ == '__main__':
    # [LAW:effects-at-boundaries] discovery scans the network, so it starts with the server, not on import.
    threading.Thread(target=run_startup_autodiscovery, daemon=True).start()
    port = find_available_port()
    print(f"Starting server on port {port}")
    # The server binds every interface so phones on the LAN can reach it; the Werkzeug
    # debugger executes arbitrary code, so it is never enabled here.
    app.run(host='0.0.0.0', port=port, debug=False)
