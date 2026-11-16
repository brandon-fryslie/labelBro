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

Python dependencies are managed by `uv` from `pyproject.toml`; frontend dependencies by `pnpm` from `package.json`.

```shell
cd <repo>

# Install uv if you don't have it
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install brew dependencies for native libraries
brew install cairo libusb

# Symlink brew libs (required for pycairo and pyusb)
ln -s /opt/homebrew/lib ~/lib

# Create the virtual environment (.venv) and install all dependencies
uv sync --extra dev

# Install Node and pnpm if you don't have them (pnpm uses the version pinned in package.json)
brew install node pnpm

# Build the frontend (label_bro/static/dist/; not committed)
pnpm install
pnpm build

# Run the app
uv run python -m label_bro.app
```

You will see some text like this:
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5099
 * Running on http://192.168.1.100:5099

The server takes the first free port from 5099 up.  Browse to the local address.  You can also browse to the network
address from another device to use the application from a phone, ipad, etc.

### Writing labels

- Each line in the textarea becomes a separate label, previewed live as you type.
- `My Label; 5` prints 5 copies of "My Label".
- Checkboxes pick the label type: full-width (text split across lines in Impact), small (one line, font sized to
  fit), or both.
- Labels are 62mm wide (696px at printer resolution).

## Development

This project uses:
- **Backend**: Python Flask with the brother_ql library; labels rendered with Cairo (pycairo)
- **Frontend**: React with TypeScript
- **Build**: Vite (`vite.config.ts`)
- **Package Management**: uv for Python, pnpm for Node.js
- **Testing**: Vitest with jsdom and Testing Library for frontend, pytest for backend

### Running Tests

```shell
uv run --extra dev pytest
pnpm test
pnpm typecheck
```

### Running in Development Mode

```shell
# Terminal 1: Start Flask backend
uv run python -m label_bro.app

# Terminal 2: Vite dev server with hot reload; it proxies /api to Flask on port 5099
pnpm dev
```

Browse to the URL Vite prints (http://localhost:5173).

## Notes

### Printer Discovery

Discovery runs when the server starts and on demand from the UI.  In order:
- USB: a Brother printer connected over USB
- SNMP broadcast on the local network
- Port 9100 probe of the local network ranges, when the SNMP broadcast finds fewer than two printers
- mDNS/Bonjour
- Port 9100 scan, only when none of the network methods above found a printer

A network printer is listed only if it answers on its port and identifies as a Brother printer.  One with no media
loaded, or not ready, is still listed, flagged with those issues.  The UI can also test a specific IP address or subnet
directly.

### Compatibility

- Tested with Brother QL-800 and QL-720NW printers
- Uses 62mm label tape by default
- Should work with other Brother QL series printers
- The printer must be powered on to print

### API

The Flask backend serves the web interface at `GET /` and its JSON API under `/api`:
- `GET /api/printers` - List discovered printers
- `POST /api/printers/discover` - Run printer discovery
- `POST /api/printers/test` - Test a manual connection to an IP or subnet
- `POST /api/previewLabels` - Generate label previews
- `POST /api/printLabels` - Print labels to the selected printer
- `POST /api/log-frontend-error` - Record a frontend error in the server log

A failed request answers with a non-2xx status and `{"error": "<message>"}`.

## Troubleshooting

### pyusb Installation Issues

If you have issues with pyusb not finding libusb:

```shell
# Make sure libusb is installed
brew install libusb

# Make sure the symlink exists
ln -sf /opt/homebrew/lib ~/lib
```

### Printer Discovery Issues

1. Make sure your printer is on the same network
2. Check that your firewall allows network discovery
3. Try the manual IP connection option
4. Restart the printer if it's not appearing

### Python Version

This application requires Python 3.11 or newer.  `uv sync` picks a matching Python automatically.

## Project Structure

```
label_bro/
├── label_bro/           # Python Flask backend
│   ├── app.py          # Main Flask application
│   ├── utils/          # Printer utilities and label creation
│   └── static/dist/    # Built frontend (pnpm build), served at /
├── src/                # React TypeScript frontend source
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   └── api/           # API client
├── index.html          # The page shell; Vite builds it and serves it in dev
├── tests/              # Frontend tests
├── pyproject.toml      # Python dependencies and metadata
├── package.json        # Node.js dependencies
└── README.md          # This file
```
