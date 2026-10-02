# Free-Form Draw Pad Tickets

Source story: `developer/2026-10-02-draw-pad/user-story.md`.

## Decisions Applied

- Build drawing math and snapshot history as a focused module `src/imagegen/frontend/draw-pad-operations.js`.
- Encapsulate modal, canvas event listeners, toolbars, and upload submission inside `src/imagegen/frontend/draw-pad.js`.
- Integrate into `workspace.js` following the same setup and escape-key patterns as `image-upload.js` and `image-editor.js`.
- Reuse `/api/images/import-upload` for backend persistence, which already handles collision-safe file storage, EXIF metadata embedding, security limits, and gallery image creation.
- Include unit test coverage with Vitest for drawing operations and DOM workflow, plus Python route tests for template rendering.

---

## Ticket 1: Draw Pad Canvas Operations & State

### Goal
Implement pure drawing calculation helpers and canvas stroke state in `draw-pad-operations.js`.

### Scope
- Pointer coordinate mapping to canvas coordinates accounting for CSS scaling.
- Drawing line segments between points with line cap, line join, and line width.
- Canvas state history stack management for Undo operations.
- Canvas initialization with solid white background.

### Verification
- Vitest unit tests in `tests/js/draw-pad-operations.test.js`.

---

## Ticket 2: Draw Pad UI Component & Gallery Integration

### Goal
Implement `draw-pad.js` providing the modal overlay, color swatches, brush sizing, eraser, undo, clear, and save-to-gallery integration.

### Scope
- Template markup in `src/imagegen/templates/index.html`:
  - `draw-toggle` button in header.
  - `draw-overlay` modal with toolbar, color swatches, brush size input, undo/clear/save buttons, and drawing canvas.
- Modern CSS styling in `src/imagegen/static/app.css` matching dark theme glassmorphism aesthetic.
- Wire `setupDrawPad` in `src/imagegen/frontend/workspace.js`.
- `saveToGallery` uploads canvas blob to `/api/images/import-upload` with CSRF token and calls `refreshGallery`.

### Verification
- Vitest unit tests in `tests/js/draw-pad.test.js` covering open/close, color swatch selection, drawing interactions, undo, clear, and save workflow.
- Workspace template render test in `tests/test_workspace_routes.py`.
- `npm run js:check`
- `uv run pytest`
- `uv run ruff check src tests`

---

## Ticket 3: Override Existing Edit Tool & Auto-Add to Source Edit Files

### Goal
Override the older image editor so gallery "Edit" buttons open the Draw Pad with the target image loaded, and automatically add saved illustrations to the active edit source list.

### Scope
- `draw-pad.js`:
  - Support `open(figure)` loading the figure's `img.src` onto the canvas with proper dimensions.
  - Call `onSavedImage(filename)` callback after successful save and gallery refresh.
- `source-images.js`:
  - Add `add(filename)` to `sourceWorkflow` to enable Edit mode and select the filename.
- `workspace.js`:
  - Route `galleryWorkflow.openMaskEditor` directly to `drawPadWorkflow.open(figure)`.
  - Pass `onSavedImage` to `setupDrawPad` to automatically add the saved drawing to `sourceWorkflow`.
- Tests:
  - Add tests in `tests/js/draw-pad.test.js` and `tests/js/workspace.test.js` verifying image loading onto canvas, edit tool override, and automatic source image selection.

### Verification
- `tests/js/draw-pad.test.js` (10 tests passing)
- `tests/js/source-images.test.js` (5 tests passing)
- `tests/js/workspace.test.js` (6 tests passing)
- `npm run js:check` (16 test files, 121 tests passing, vite build clean)
- `uv run pytest` (559 passed)
- `uv run ruff check src tests` (All checks passed)

