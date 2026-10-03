import { csrfFormRequest } from "./api.js";
import {
  createHistoryStack,
  drawDot,
  drawLineSegment,
  initializeCanvas,
  pointerCanvasPosition,
} from "./draw-pad-operations.js";

const DEFAULT_BRUSH_SIZE = 6;
const DEFAULT_COLOR = "#000000";
const BACKGROUND_COLOR = "#ffffff";
const MAX_UNDO_SNAPSHOTS = 25;

export function setupDrawPad(root = document, services = {}) {
  const {
    csrfToken = "",
    imageFactory = () => new Image(),
    onSavedImage = async () => {},
    refreshGallery = async () => {},
    showMessage = () => {},
  } = services;

  const toggleButton = root.querySelector(".draw-toggle");
  const overlay = root.querySelector(".draw-overlay");
  const closeButton = overlay?.querySelector(".draw-close");
  const titleElement = overlay?.querySelector("#draw-title");
  const canvas = overlay?.querySelector(".draw-canvas");
  const colorPicker = overlay?.querySelector(".draw-color-picker");
  const colorPickerSwatch = overlay?.querySelector(".draw-color-picker-swatch");
  const colorOverrideWrap = overlay?.querySelector(".draw-color-override");
  const swatches = overlay?.querySelectorAll(".draw-swatch");
  const brushSizeInput = overlay?.querySelector(".draw-brush-size");
  const brushSizeValue = overlay?.querySelector(".draw-brush-size-value");
  const eraserButton = overlay?.querySelector(".draw-eraser");
  const undoButton = overlay?.querySelector(".draw-undo");
  const clearButton = overlay?.querySelector(".draw-clear");
  const saveButton = overlay?.querySelector(".draw-save");
  const statusElement = overlay?.querySelector(".draw-status");

  const uploadUrl = overlay?.dataset?.apiUploadUrl || "/api/images/import-upload";
  const ctx = canvas?.getContext ? canvas.getContext("2d") : null;
  const history = createHistoryStack(MAX_UNDO_SNAPSHOTS);

  let currentColor = DEFAULT_COLOR;
  let brushSize = DEFAULT_BRUSH_SIZE;
  let isEraser = false;
  let isDrawing = false;
  let lastPoint = null;
  let isBusy = false;

  function setStatus(text, category = "info") {
    if (!statusElement) {
      return;
    }
    statusElement.textContent = text || "";
    statusElement.className = "draw-status";
    if (text) {
      statusElement.classList.add(`draw-status-${category}`);
    }
  }

  function setBusy(busy) {
    isBusy = busy;
    if (saveButton) {
      saveButton.disabled = busy;
      saveButton.setAttribute("aria-busy", String(busy));
    }
    if (clearButton) {
      clearButton.disabled = busy;
    }
    if (undoButton) {
      undoButton.disabled = busy || !history.canUndo();
    }
  }

  function takeSnapshot() {
    if (!ctx || !canvas) {
      return null;
    }
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  function restoreSnapshot(snapshot) {
    if (!ctx || !snapshot) {
      return;
    }
    ctx.putImageData(snapshot, 0, 0);
  }

  function resetCanvas() {
    if (!ctx || !canvas) {
      return;
    }
    initializeCanvas(ctx, canvas.width, canvas.height, BACKGROUND_COLOR);
  }

  function loadImage(src) {
    if (!canvas || !ctx) {
      return;
    }
    const img = imageFactory();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth || img.width || 512;
      const h = img.naturalHeight || img.height || 512;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      history.clear();
      const snapshot = takeSnapshot();
      if (snapshot) {
        history.push(snapshot);
      }
      if (undoButton) {
        undoButton.disabled = true;
      }
    };
    img.onerror = () => {
      setStatus("Could not load image onto canvas.", "error");
    };
    img.src = src;
  }

  function updateColor(color) {
    currentColor = color;
    isEraser = false;
    if (eraserButton) {
      eraserButton.setAttribute("aria-pressed", "false");
      eraserButton.classList.remove("draw-tool-active");
    }
    if (colorPicker && colorPicker.value !== color) {
      colorPicker.value = color;
    }
    if (colorPickerSwatch) {
      colorPickerSwatch.style.backgroundColor = color;
    }
    let matchedSwatch = false;
    swatches?.forEach((swatch) => {
      const match = swatch.dataset.color?.toLowerCase() === color.toLowerCase();
      if (match) {
        matchedSwatch = true;
      }
      swatch.classList.toggle("active", match);
      swatch.setAttribute("aria-checked", String(match));
    });
    if (colorOverrideWrap) {
      colorOverrideWrap.classList.toggle("active", !matchedSwatch);
    }
  }

  function updateBrushSize(size) {
    brushSize = Math.max(
      1,
      Math.min(64, Number.parseInt(size, 10) || DEFAULT_BRUSH_SIZE),
    );
    if (brushSizeValue) {
      brushSizeValue.textContent = `${brushSize} px`;
    }
  }

  function toggleEraser() {
    isEraser = !isEraser;
    if (eraserButton) {
      eraserButton.setAttribute("aria-pressed", String(isEraser));
      eraserButton.classList.toggle("draw-tool-active", isEraser);
    }
    if (isEraser) {
      swatches?.forEach((swatch) => {
        swatch.classList.remove("active");
        swatch.setAttribute("aria-checked", "false");
      });
      if (colorOverrideWrap) {
        colorOverrideWrap.classList.remove("active");
      }
    } else {
      updateColor(currentColor);
    }
  }

  function handlePointerDown(event) {
    if (isBusy || !ctx || !canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const position = pointerCanvasPosition(event, rect, canvas.width, canvas.height);
    if (!position) {
      return;
    }

    const snapshot = takeSnapshot();
    if (snapshot) {
      history.push(snapshot);
      if (undoButton) {
        undoButton.disabled = false;
      }
    }

    isDrawing = true;
    lastPoint = position;
    drawDot(ctx, position, {
      backgroundColor: BACKGROUND_COLOR,
      color: currentColor,
      isEraser,
      size: brushSize,
    });
    canvas.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!isDrawing || !ctx || !canvas || !lastPoint) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const position = pointerCanvasPosition(event, rect, canvas.width, canvas.height);
    if (!position) {
      return;
    }

    drawLineSegment(ctx, lastPoint, position, {
      backgroundColor: BACKGROUND_COLOR,
      color: currentColor,
      isEraser,
      size: brushSize,
    });
    lastPoint = position;
  }

  function handlePointerUp(event) {
    if (!isDrawing) {
      return;
    }
    isDrawing = false;
    lastPoint = null;
    canvas?.releasePointerCapture?.(event.pointerId);
  }

  function handleUndo() {
    if (isBusy || !history.canUndo()) {
      return;
    }
    const snapshot = history.pop();
    if (snapshot) {
      restoreSnapshot(snapshot);
    }
    if (undoButton) {
      undoButton.disabled = !history.canUndo();
    }
  }

  function handleClear() {
    if (isBusy || !ctx || !canvas) {
      return;
    }
    const snapshot = takeSnapshot();
    if (snapshot) {
      history.push(snapshot);
      if (undoButton) {
        undoButton.disabled = false;
      }
    }
    resetCanvas();
  }

  async function handleSave() {
    if (isBusy || !canvas || !uploadUrl) {
      return;
    }
    setBusy(true);
    setStatus("Saving drawing...", "info");

    try {
      const blob = await new Promise((resolve, reject) => {
        if (canvas.toBlob) {
          canvas.toBlob((result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error("Failed to export drawing."));
            }
          }, "image/png");
        } else {
          reject(new Error("Canvas toBlob not supported."));
        }
      });

      const formData = new FormData();
      formData.append("image", blob, `drawing-${Date.now()}.png`);

      const data = await csrfFormRequest(uploadUrl, formData, {
        csrfToken,
        fallbackMessage: "Failed to save drawing.",
      });

      await refreshGallery();
      const filename = data?.image?.filename;
      if (filename) {
        await onSavedImage(filename);
      }
      showMessage(
        filename
          ? `Saved ${filename} and added to edit sources.`
          : "Drawing saved to gallery.",
        "success",
      );
      close();
    } catch (error) {
      setStatus(error.message || "Failed to save drawing.", "error");
    } finally {
      setBusy(false);
    }
  }

  function open(figure = null) {
    if (!overlay) {
      return;
    }
    const filename = figure?.dataset?.filename;
    const imageUrl = figure?.querySelector("img")?.src;

    if (filename && imageUrl) {
      overlay.dataset.filename = filename;
      if (titleElement) {
        titleElement.textContent = `Draw: ${filename}`;
      }
      overlay.hidden = false;
      setStatus(`Draw over ${filename}, pick colors, and save.`);
      loadImage(imageUrl);
      return;
    }

    delete overlay.dataset.filename;
    if (titleElement) {
      titleElement.textContent = "Draw Pad";
    }
    if (canvas) {
      canvas.width = 512;
      canvas.height = 512;
    }
    resetCanvas();
    history.clear();
    if (undoButton) {
      undoButton.disabled = true;
    }
    overlay.hidden = false;
    setStatus("Illustrate with mouse or pointer, pick colors, and save to gallery.");
  }

  function close() {
    if (!overlay) {
      return;
    }
    delete overlay.dataset.filename;
    overlay.hidden = true;
    isDrawing = false;
    lastPoint = null;
  }

  function isOpen() {
    return Boolean(overlay && !overlay.hidden);
  }

  // Wire event listeners
  toggleButton?.addEventListener("click", () => open());
  closeButton?.addEventListener("click", close);

  swatches?.forEach((swatch) => {
    const color = swatch.dataset.color;
    if (color) {
      swatch.style.backgroundColor = color;
    }
    swatch.addEventListener("click", () => {
      if (color) {
        updateColor(color);
      }
    });
  });

  colorPicker?.addEventListener("input", (event) => {
    updateColor(event.target.value);
  });
  colorPicker?.addEventListener("change", (event) => {
    updateColor(event.target.value);
  });

  brushSizeInput?.addEventListener("input", (event) => {
    updateBrushSize(event.target.value);
  });

  eraserButton?.addEventListener("click", toggleEraser);
  undoButton?.addEventListener("click", handleUndo);
  clearButton?.addEventListener("click", handleClear);
  saveButton?.addEventListener("click", handleSave);

  canvas?.addEventListener("pointerdown", handlePointerDown);
  canvas?.addEventListener("pointermove", handlePointerMove);
  canvas?.addEventListener("pointerup", handlePointerUp);
  canvas?.addEventListener("pointercancel", handlePointerUp);
  canvas?.addEventListener("pointerleave", handlePointerUp);

  return {
    close,
    isOpen,
    open,
  };
}
