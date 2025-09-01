# label_bro

Generate labels to print on your Brother QL-800 Label Printer

This app was written almost entirely by ChatGPT as an exercise in how well a custom GPT configured to be an expert at a 
particular python library would perform.  I would say it cut the time to develop in at least 1/2, although I did spend 
a decent amount of time on it.  But rendering live client-size previews were added by ChatGPT in one step (an additional
step was used to tweak them and add debounce, etc).

I did of course have to learn how all of it worked to fix a couple subtle bugs.  :)

Note: this was written for a Brother QL-800 printer with 62mm tape.  However it should work (with minor tweaks) 
with any printer supported by this library: https://github.com/pklaus/brother_ql

## Usage

### Python Setup with uv (Recommended)

The modern and fastest way to set up Python dependencies is using `uv`. This replaces the need for `pip`, `venv`, and `pyenv`.

```shell
cd <repo>

# Install uv if you don't have it
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install brew dependencies for native libraries
brew install cairo libusb

# Symlink brew libs (required for pycairo and pyusb)
ln -s /opt/homebrew/lib ~/lib

# Create virtual environment and install all dependencies
uv sync

# Run the app
uv run python label_bro/app.py

# Or run with proper module path
uv run python -m label_bro.app
```

### Legacy Setup (venv + pip)

If you prefer the traditional approach:

```shell
cd <repo>

# make a venv
python3 -m venv venv

# activate venv
. ./venv/bin/activate

# install brew dependencies
brew install cairo libusb

# symlink brew libs
ln -s /opt/homebrew/lib ~/lib

# install python dependencies from pyproject.toml
pip install -e .

# run the app
python3 -m label_bro.app
```

### Development

For development work, install with dev dependencies:

```shell
# Using uv (recommended)
uv sync --group dev

# Or using pip
pip install -e ".[dev]"
```

### Running Tests

```shell
# Using uv
uv run pytest

# Or using pip/venv
pytest
```

You will see some text like this:
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5100
 * Running on http://192.168.1.100:5100

Then browse to the local address.  That being said, you can also browse to the network address from another device to use the application from a phone, ipad, etc.

## Notes

### Connection

When you run the app, it will:
- Automatically discover Brother printers on your network using mDNS/Bonjour
- Show available printers in the web interface
- Allow you to connect and print labels

### Label Templates

The application supports:
- Text labels with various fonts and sizes
- Multiple label formats (small and full-width)
- Live preview before printing
- Label history

### Network Discovery

The app uses multiple discovery methods:
- mDNS/Bonjour for automatic discovery
- Network scanning for manual discovery
- Direct IP connection option

### Compatibility

- Tested with Brother QL-800 and QL-720NW printers
- Uses 62mm label tape by default
- Should work with other Brother QL series printers

### API

The Flask backend provides these endpoints:
- `/printers` - List connected printers
- `/printers/discover` - Discover new printers
- `/previewLabels` - Generate label previews
- `/printLabels` - Print labels to selected printer

## Development

This project uses:
- **Backend**: Python Flask with Brother QL library
- **Frontend**: React with TypeScript
- **Build**: Vite for frontend bundling
- **Package Management**: uv for Python, npm for Node.js
- **Testing**: Jest for frontend, pytest for backend

### Building the Frontend

```shell
npm install
npm run build
```

### Running in Development Mode

```shell
# Terminal 1: Start Flask backend
uv run python label_bro/app.py

# Terminal 2: Start frontend development server
npm run dev
```

## Troubleshooting

### pyusb Installation Issues

If you have issues with pyusb not finding libusb:

```shell
# Make sure libusb is installed
brew install libusb

# Make sure the symlink exists
ln -sf /opt/homebrew/lib ~/lib

# Reinstall pyusb
uv pip install --force-reinstall pyusb
```

### Printer Discovery Issues

1. Make sure your printer is on the same network
2. Check that your firewall allows network discovery
3. Try the manual IP connection option
4. Restart the printer if it's not appearing

### Modern Python Required

This application requires Python 3.11 or newer. If you're using an older Python:

```shell
# Install uv (which handles Python versions automatically)
curl -LsSf https://astral.sh/uv/install.sh | sh

# uv will automatically use the correct Python version
uv sync
```

It is not recommended you use system Python or older versions. Use `uv` for the best experience.

## Project Structure

```
label_bro/
├── label_bro/           # Python Flask backend
│   ├── app.py          # Main Flask application
│   ├── utils/          # Printer utilities and label creation
│   ├── templates/      # HTML templates
│   └── static/         # Static files and built frontend
├── src/                # React TypeScript frontend source
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   └── api/           # API client
├── tests/              # Test files
├── pyproject.toml      # Python dependencies and metadata
├── package.json        # Node.js dependencies
├── vite.config.ts      # Frontend build configuration
└── README.md          # This file
```

The key files are:
- pyproject.toml (Python dependencies managed by uv)
- package.json (Node.js dependencies)
- label_bro/app.py (main Flask application)
- src/components/App.tsx (main React component)