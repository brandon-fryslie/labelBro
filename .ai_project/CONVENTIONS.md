
## Commands
- **Run app**: `python3 -m label_bro.app` (Flask web app for Brother QL-800 printer)
- **Test**: `pytest` or `python3 -m unittest` for single tests like `python3 -m unittest label_bro.tests.test_cli`
- **Build**: `python3 -m pip install -e .` (install in development mode)
- **Lint**: No configured linter (project uses basic Python style)

## Architecture
- **Main components**: Flask web app (`app.py`), CLI (`cli.py`), label creation (`utils/label_creation.py`), printer utilities (`utils/printer_utils.py`)
- **Frontend**: Simple HTML/JS/CSS in `static/` and `templates/` directories
- **Dependencies**: brother_ql (printer), cairo (graphics), Flask (web), zeroconf (mDNS discovery), netifaces (network interface detection)
- **Entry point**: `label_bro.cli:main` console script, web app runs on http://0.0.0.0:5099

## Code Style
- **Imports**: Standard library first, third-party, then local imports (`from label_bro.utils import module`)
- **Types**: Use typing annotations (`from typing import List, Dict, Optional, Tuple`)
- **Functions**: Snake_case, descriptive names like `create_full_width_label_image()`
- **Error handling**: Try/catch with detailed error responses, global Flask error handler
- **Formatting**: 4-space indentation, descriptive variable names
- **Structure**: Modular design with utils/ for business logic, separation of web/CLI interfaces

## Setup
- Requires venv activation: `. ./venv/bin/activate`
- System deps: `brew install cairo libusb` and `ln -s /opt/homebrew/lib ~/lib`
- Python deps: `python3 -m pip install -r requirements.txt`
