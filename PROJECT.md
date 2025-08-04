
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LabelBro is a Flask web application for generating and printing labels on Brother QL-800 Label Printers. The app generates live previews of labels as users type and supports multiple label formats (full-width and small labels).

## Architecture

### Core Components
- **Flask Web App** (`label_bro/app.py`): Main web server with endpoints for label preview and printing
- **Label Creation** (`label_bro/utils/label_creation.py`): Cairo-based image generation for full-width and small labels
- **Printer Utils** (`label_bro/utils/printer_utils.py`): Direct printer communication using brother_ql library
- **Frontend** (`label_bro/static/js/app.ts` + `label_bro/templates/index.html`): TypeScript-powered live preview interface with comprehensive type definitions and debounced updates
- **Frontend (Legacy)** (`label_bro/static/js/app.js`): JavaScript version still functional for compatibility

### Key Technical Details
- Uses Cairo (pycairo) for high-quality label image rendering
- Labels are 62mm wide (696px at printer resolution)
- Full-width labels split text into multiple lines with Impact font
- Small labels use single-line text with dynamic font sizing
- Real-time preview generation via AJAX endpoints
- Special syntax for multiple copies: "text; 5" prints 5 labels

### Printer Discovery
- **SNMP Broadcast Discovery**: Primary method using custom lightweight SNMP implementation
- **SNMP Targeted Discovery**: Scans only current /24 subnet when broadcast fails
- **Manual Connection Testing**: UI for testing specific IP addresses or subnets
- **Media Detection**: Verifies printer has media loaded before considering it valid
- **mDNS/Bonjour Discovery**: Uses zeroconf for service discovery
- **Network Port Scanning**: Final fallback scanning port 9100
- **USB Discovery**: Automatic detection of USB-connected Brother printers
- All discovered printers are verified for connectivity and media status before being listed

## Development Commands

### Environment Setup
```bash
# Create and activate virtual environment
python3 -m venv venv
. ./venv/bin/activate

# Install system dependencies (macOS)
brew install cairo libusb
ln -s /opt/homebrew/lib ~/lib

# Install Python dependencies
python3 -m pip install -r requirements.txt

# Fix pyusb if needed
python3 -m pip uninstall pyusb; python3 -m pip install pyusb
```

### Running the Application

#### Modern Development (Recommended)
```bash
# Install just command runner (one time)
brew install just  # macOS
# See https://github.com/casey/just#installation for other platforms

# Start both TypeScript watcher and Flask server in parallel
just dev

# Other useful commands
just setup     # Install all dependencies
just status    # Check project status
just test      # Run all tests
just clean     # Clean build artifacts
```

#### Traditional Method
```bash
# Start Flask development server
python3 -m label_bro.app

# Run CLI tool
python3 -m label_bro.cli
```

### Testing
```bash
# Run tests with pytest
pytest

# Run tests with tox (multiple Python versions)
tox

# TypeScript type checking
npm run typecheck
```

### TypeScript Development
```bash
# Install TypeScript dependencies
npm install

# Type check frontend code
npm run typecheck

# Watch for TypeScript changes with continuous type checking
npm run watch

# Build/validate TypeScript
npm run build
```

## Hardware Requirements

- Brother QL-800 Label Printer (or compatible brother_ql supported printer)
- 62mm label tape
- USB connection to host machine
- Printer must be powered on for printing functionality

## API Endpoints

- `/` - Main web interface
- `/printers` - GET: List available printers
- `/printers/discover` - POST: Run full printer discovery
- `/printers/test` - POST: Test manual connection to IP or subnet
- `/preview` - POST: Generate label preview images
- `/print_labels` - POST: Send labels to printer

## Special Syntax

- Multiple copies: "My Label; 5" creates 5 copies
- Checkboxes control label types (full-width, small, or both)
- Each line in textarea creates separate labels
