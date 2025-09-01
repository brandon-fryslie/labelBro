Refine UX design

- Buttons and controls should be structured in some way, not just random icons
- History panel is non functional, it should be functional
- Logs panel is non functional
- Help button is non functional
- Buttons are large and awkward looking
- Styling in general is poor quality and ugly.  It should be sleek and functional
- The design should be responsive, with layouts that work well on the device in use

Refine log panel


Implement a Collapsible Bottom Log Panel (React + Tailwind + Supabase UI)

I want a React component that renders a log panel fixed at the bottom of the screen. It must toggle between a collapsed bar and an expanded scrollable view.

Requirements:
1.	Position & Layout
•	position: fixed; bottom: 0; left: 0; width: 100% so it stays pinned to the bottom regardless of scrolling.
•	Collapsed state: height ~50px, full‑width bar showing the most recent 1–2 log lines.
•	Expanded state: height ~50% of viewport height, scrollable list of log messages.
2.	Behavior
•	Clicking anywhere on the collapsed bar expands it.
•	Expanded view shows an X close button (use Supabase UI button or icon) in the top‑right corner.
•	Clicking the X or clicking outside the expanded panel collapses it.
•	Clicking inside the expanded panel should not trigger collapse.
3.	Log Display
•	Logs displayed in reverse chronological order (newest first).
•	Expanded view scrollable (overflow-y-auto).
•	Collapsed view only shows the latest 1–2 log entries.
4.	User Experience
•	Smooth CSS transition for expanding/collapsing (transition-all duration-300 ease-in-out).
•	Panel overlays content — page content should not shift upward.
•	Should remain visible and fixed even if the page scrolls.
5.	Integration
•	Written as a self‑contained functional React component.
•	Use Tailwind classes for layout and styling.
•	Use Supabase UI components for buttons/icons where appropriate.
•	Accept a logs prop (array of strings) so the component can be fed real log data.

State Flow Example:

Collapsed: thin bar at bottom → click bar → expands to 50% height
Expanded: scrollable log panel → click X or outside → collapses

