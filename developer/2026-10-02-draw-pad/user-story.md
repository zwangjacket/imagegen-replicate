# Free-Form Draw Pad

## User Story

As a creator composing image generation and editing prompts, I want a free-form
draw pad in the application header where I can sketch illustrations with my mouse
or pointer using a curated color palette and save them directly to the gallery,
so that I can quickly create sketches to guide image-to-image or edit workflows
without needing external drawing software.

## Acceptance Criteria

1. **Header Entry Point**:
   - A dedicated "Draw" button is present in the workspace header alongside "Upload".
   - Clicking "Draw" opens the Draw Pad modal overlay.
   - Pressing `Escape` or clicking the close button dismisses the Draw Pad overlay.

2. **Free-Form Canvas**:
   - The Draw Pad contains a high-resolution, responsive drawing canvas (default 512x512).
   - Free-form strokes can be drawn smoothly using mouse or pointer interactions
     (`pointerdown`, `pointermove`, `pointerup`, `pointerleave`).
   - The canvas starts with a clean, solid background suitable for sketching.

3. **Color Palette & Tools**:
   - A curated set of quick-select color swatches (e.g., Black, White, Gray, Red,
     Orange, Yellow, Green, Blue, Purple, Brown) is easily accessible.
   - The active color swatch is visually distinguished and exposes appropriate
     accessibility attributes.
   - A custom color picker is provided for selecting arbitrary hex colors.
   - Brush stroke size can be adjusted with a slider and live size indicator.
   - An eraser tool allows erasing drawn strokes back to the canvas background.
   - An Undo action reverts previous strokes.
   - A Clear action wipes the canvas back to a fresh state.

4. **Gallery Integration**:
   - A "Save to Gallery" action converts the drawn illustration to an image and
     uploads it through the existing image import boundary (`/api/images/import-upload`).
   - While saving, controls show busy state and prevent duplicate submissions.
   - Upon successful save, the local gallery automatically refreshes and displays
     the new drawing card, ready for previewing or toggling as an edit source image.
   - The Draw Pad provides clear success feedback and closes or resets.

5. **Security & Validation**:
   - CSRF protection is enforced on upload submission.
   - Saved drawings are validated by backend image import safeguards (decoded
     pixel limits, collision-safe filenames, metadata embedding).
