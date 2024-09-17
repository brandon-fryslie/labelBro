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

```shell
cd <repo>
python3 -m pip install -r requirements.txt
python3 -m label_bro.app
```

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
- label_bro/static/app.js
- label_bro/templates/index.html
- label_bro/app.py
- label_bro/utils/label_creation.py
- label_bro/utils/printer_utils.py

Less important but still used is:
- label_bro/static/css/style.css
- requirements.txt

Besides `setup.py`, the other files are likely not even used in any way (ChatGPT generated the entire structure).

