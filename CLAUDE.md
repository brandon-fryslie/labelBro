# CLAUDE.md

LabelBro: a Flask server (`label_bro/`) and a React + TypeScript frontend (`src/`) for previewing and printing labels
on Brother QL printers.

## Workflow

- Work is tracked in lit. `lit next` picks the next ticket; `lit quickstart` explains the rest.
- Code follows the universal architectural laws (the `laws:code` skill).
- Setup, build, test and run commands live in README.md. Don't duplicate them here.

## Project rules

- No fake demo data in features. Displays read real backend or app state, and show an empty state when there is none.
