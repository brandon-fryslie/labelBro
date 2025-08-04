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

### pyenv

First we need a Python.  Don't use system python.  It can cause problems and it's old.  Instead, install `pyenv` via the following steps:

- `brew install pyenv`
- Run `pyenv init` and copy the non-comment lines.  Then paste them into your .zshrc and open a new shell
- Run `pyenv install 3.12` (or whichever version of python you want)
- Make that your global default: `pyenv global 3.12`
- Run `which python3`.  It should print something like `/Users/my-username/.pyenv/shims/python3`.  If it doesn't, retry the previous steps until it works.

The following steps will assume you are using a standard non-system python installed via pyenv.

### venv

There are many more complicated ways to use venv so feel free to use one of them if you're familiar.

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

# install python dependencies
python3 -m pip install -r requirements.txt

# note: if pyusb is installed before libusb, remove and reinstall it
python3 -m pip uninstall pyusb; python3 -m pip install pyusb

# run the app
# Note: by default this makes the application available over the local network so you can use it from your phone or ipad
python3 -m label_bro.app

# you will see some text like this:
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5099
 * Running on http://192.168.7.83:5099

# open the webapp (this probably only works on MacOS, for other OSes paste the url into your browser)
# Note: the 127 address will only work on the machine hosting the application.  Use the 192 address for network access
open http://127.0.0.1:5099
```

### Modern Development Workflow (Recommended)

For the best development experience, use the included `justfile` which provides a modern Make-like workflow:

```shell
# Install just command runner (one time setup)
# macOS: brew install just
# Other platforms: https://github.com/casey/just#installation

# Start both TypeScript watcher AND Python server in parallel
just dev

# This command will:
# - Start TypeScript watcher for live type checking
# - Start the Flask development server
# - Show colored output from both services
# - Stop both when you press Ctrl+C

# Other useful commands:
just status    # Check project status and dependencies
just setup     # Install all dependencies (Python + Node)
just test      # Run all tests (Python + TypeScript)
just typecheck # Type check TypeScript only
just clean     # Clean build artifacts
```

The `just dev` command is the recommended way to develop as it provides:
- Live TypeScript type checking as you edit
- Automatic Flask reloading on Python changes  
- Color-coded output to distinguish TypeScript vs Python logs
- Single command to start/stop both services

Now type some stuff into the text field.  A few seconds after you stop typing, the previews will appear.

Enter multiple lines for multiple labels.  Use the `my-text; 5` syntax to print multiple labels.  Note you will be unable to print labels
containing a semicolon and whitespace is not significant (`my-text:5` is equivalent to `my-text:       5`).

Press the big `Print` button to print your labels.  The printer must be connected to the host via USB and powered on.

Note: you can prevent your printer from turning off automatically after an hour by using Brother's firmware updater app.

### TypeScript Development (Optional)

The frontend JavaScript has been converted to TypeScript for improved type safety and development experience. This is optional for basic usage but recommended for development.

```shell
# Install TypeScript dependencies (one time setup)
npm install

# Type check the frontend code
npm run typecheck

# Watch for changes and continuously type check
npm run watch

# Build/validate TypeScript
npm run build
```

The TypeScript source is located at `label_bro/static/js/app.ts` with comprehensive type definitions for all API responses and UI interactions. The original `app.js` continues to work, but developers should use the TypeScript version for modifications.

### system python

Don't bother using system python.  Just install `pyenv`, install a python (e.g., `pyenv install 3.12`), then
use that globally (e.g., `pyenv global 3.12`).  Make sure to insert the pyenv code into your .zshrc file (run `pyenv init`, paste the non-comment lines into your .zshrc file) and open a new shell.

It is not recommended you do this.  Run `python3 -m pip install venv` to install the virtualenv package and follow the venv instructions.

If you really want to, just run `python3 -m label_bro.app` repeatedly and install whatever dependencies it complains about until it works.
The instructions may vary based on OS.

### Functionality

Python serves a small flask app.  This flask app has endpoints which use the `brother_ql` python library for direct communication
with the printer.  The app provides an interface to print very specifically formatted labels.

I tend to print 2 labels for each bin: one "full width" label, and one "small" label.  The full width label is meant for
the face of the bin and should be visible from a distance.  The small label is for the lid and needs to fit without overlapping anything 
or it will peel off.

The app is able to do this pretty decently.  All full width labels will be split so each word is on a new line and take the fill width of the
62mm tape (with some margin).  The small label will be a maximum of ~24pt font and may be smaller if there is a long string of text.

The app consists of a multiline text field.  Each line will be default print 1 full width label and one small label.  Checkboxes
allow you to print only one or the other.

Additionally, there is a special syntax that allows printing multiple labels on a per label basis.  Entering 'Random Crap; 5' will print
5x labels with the text "Random Crap".  This respects the checkbox state.  If both are checked, you will get 10x labels total.  Otherwise 5x of whatever is checked.

As you type, a preview of the label will be generated and displayed in the browser.  Make sure your printer is on, click the button, and inshallah you'll have some labels!

Errors will most likely be displayed in the webui, but this is not guaranteed.  See the app logs (stderr) for more potential errors.

## Structure

Most of the files are boilerplate and uninteresting.

ChatGPT initially generated all of the code in one single file.  At a certain size, it
became impractical to keep it in one file so I had ChatGPT split it up, generate an appropriate python module structure,
and then I would feed it specific files/functions to work on rather than the entire codebase.  But it should be possible to
continually feed the entire codebase to ChatGPT as well with a bit of tooling.

The important files are:
- label_bro/static/js/app.ts (TypeScript frontend with type definitions)
- label_bro/static/js/app.js (compiled JavaScript - still functional)
- label_bro/templates/index.html
- label_bro/app.py
- label_bro/utils/label_creation.py
- label_bro/utils/printer_utils.py

Development and configuration files:
- justfile (modern Make-like task runner with dev workflow)
- tsconfig.json (TypeScript configuration)
- package.json (npm dependencies for TypeScript)
- label_bro/static/css/style.css
- requirements.txt

Documentation:
- TYPESCRIPT.md (TypeScript setup and usage guide)

Besides `setup.py`, the other files are likely not even used in any way (ChatGPT generated the entire structure).

