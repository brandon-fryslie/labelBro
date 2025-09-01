# UX/UI Design

UI Design:
- Optimized for efficient use of space, especially on mobile
- Supabase UI library for drop in components
- Fits all relevant UI elements on a single page on mobile
  - Center: the text box for entering text to create stickers
  - Below: Live Preview
  - Collapsable Top Bar: Printer connectivity
  - Collapsable Bottom Bar: Logs
  - Print button absolutely positioned in the lower right corner of screen
  - (?) icon with a lightweight modal with instructions
  - Print options:
    - Big label?
      - Controls whether to print the larger label
    - Small label?
      - Controls whether to print the smaller label
    - Clear after print?
      - Whether we clear the textarea after a successful print (textarea is not cleared on unsuccessful print)
  - History panel
    - 'list' icon to hide/show
    - hidden by default
    - history slides in on the right side over the text area, showing the label print history.  clicking one replaces the text in the text area with the item so it can be printed again

- Buttons and controls should be structured in some way, not just random icons
- History panel is non functional, it should be functional
- Logs panel is non functional
- Help button is non functional
- Buttons are large and awkward looking
- Styling in general is poor quality and ugly.  It should be sleek and functional
- The design should be responsive, with layouts that work well on the device in use
