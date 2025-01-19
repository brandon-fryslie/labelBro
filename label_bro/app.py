import os
import traceback
from datetime import datetime
from typing import List, Dict

import flask
import io
import base64
from label_bro.utils import printer_utils
from label_bro.utils import label_creation
import openai

# Initialize the OpenAI client
client = openai.OpenAI(
    api_key=os.getenv('OPENAI_API_KEY')
)

if not client.api_key:
    print("Warning: OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.")

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


@app.route('/printLabels', methods=['POST'])
def print_labels_endpoint():
    data = flask.request.json.get('data', {})
    text_content = data.get('text', '')
    should_print_full = data.get('shouldPrintFullLabel', True)
    should_print_small = data.get('shouldPrintSmallLabel', True)

    errors: List[str] = []

    if not text_content:
        return flask.jsonify({'error': 'Invalid input'}), 400

    if not isinstance(should_print_full, bool) and not isinstance(should_print_small, bool):
        return flask.jsonify({'error': 'Invalid input. shouldPrintFullLabel and shouldPrintSmallLabel must be boolean values'}), 400


    if not printer_utils.check_printer_connection():
        return flask.jsonify({'error': 'Printer not found. Please check the USB connection.'}), 500

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
                status = label_creation.process_label(label_text, LABEL_WIDTH, 'full')
                if status:
                    errors.append(str(status))

            if should_print_small:
                status = label_creation.process_label(label_text, LABEL_WIDTH, 'small')
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


@app.route('/aiGenerate', methods=['POST'])
def ai_generate():
    data = flask.request.json
    prompt = data.get('prompt', '')

    # Define the additional context with clear instructions
    additional_context = (
        'You are tasked with writing Python code that generates a cairo.ImageSurface object. '
        'This object should be suitable for printing on a 2.4 inch label. '
        'The code must create a local variable named "surface" that holds the cairo.ImageSurface object. '
        'The image should be generated based on the user prompt provided at the end of this message. '
        'Include drawing instructions to create an image that represents the prompt. '
        'Do not write the surface to a file. '
        'Return only the code, without any comments. Here is the user prompt:'
    )

    def generate_code(prompt):
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": additional_context},
                    {"role": "user", "content": prompt}
                ],
            )
            # Ensure the generated code is clean and does not include language identifiers
            code = response.choices[0].message.content.strip()
            if code.startswith("python"):
                code = code[len("python"):].strip()
            # Remove the first line of the code
            code_lines = code.split('\n')
            code = '\n'.join(code_lines[1:]).replace('```', '')

            # Validate the code
            try:
                compile(code, '<string>', 'exec')
            except SyntaxError as e:
                return flask.jsonify({'error': f'Generated code is not valid Python: {str(e)}'}), 400

            return code
        except Exception as api_error:
            return None, f'API error: {str(api_error)}'

    def is_code_valid(code):
        return "cairo.ImageSurface" in code and "surface" in code and "context" in code

    def is_code_valid(code):
        return "cairo.ImageSurface" in code and "surface" in code and "context" in code

    # Attempt to generate valid code, retrying once if necessary
    attempts = 2
    prompt = data.get('prompt', '')
    for attempt in range(attempts):
        generated_code = generate_code(prompt)
        if is_code_valid(generated_code):
            # Execute the code to generate the surface
            local_vars = {}
            exec(generated_code, globals(), local_vars)
            surface = local_vars.get('surface')
            if surface:
                # Convert the surface to a base64-encoded image
                buffer = io.BytesIO()
                surface.write_to_png(buffer)
                buffer.seek(0)
                img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
                image_data = f'data:image/png;base64,{img_str}'

                return flask.jsonify({'code': generated_code, 'image': image_data}), 200
        # Refine the prompt for the next attempt
        if attempt == 0:
            prompt = (
                f"{prompt}. Please ensure the code includes a cairo.ImageSurface and a variable named 'surface'. "
                "The code should be complete and executable, focusing on generating an image based on the prompt."
            )

    # If both attempts fail, return an error
    return flask.jsonify({'error': 'Generated code is invalid or incomplete after refinement. Please refine your prompt.'}), 400

@app.route('/executeCode', methods=['POST'])
def execute_code():
    data = flask.request.json
    generated_code = data.get('code', '')

    if not generated_code:
        return flask.jsonify({'error': 'No code provided for execution'}), 400

    # Evaluate the generated code to create a cairo.ImageSurface object
    local_vars = {}
    try:
        exec(generated_code, globals(), local_vars)

        # Assuming the generated code creates a variable named 'surface'
        surface = local_vars.get('surface')
        if surface:
            # Return success without printing
            return flask.jsonify({'status': 'Code executed successfully, ready to print'}), 200
        else:
            return flask.jsonify({'error': 'Failed to generate label surface'}), 500
    except Exception as exec_error:
        return flask.jsonify({'error': f'Execution error: {str(exec_error)}', 'details': traceback.format_exc()}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5099, debug=True)
