import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setupDrawPad } from "../../src/imagegen/frontend/draw-pad.js";

function jsonResponse(data, init = {}) {
  return {
    json: async () => data,
    ok: init.ok ?? true,
    status: init.status || 200,
  };
}

function renderDrawPadWorkspace() {
  document.body.innerHTML = `
    <button class="draw-toggle" type="button" aria-haspopup="dialog">
      <span>Draw</span>
    </button>
    <div
      class="draw-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draw-title"
      data-api-upload-url="/api/images/import-upload"
      hidden
    >
      <div class="draw-pane">
        <div class="draw-bar">
          <h2 id="draw-title">Draw Pad</h2>
          <button class="draw-close" type="button" aria-label="Close draw pad">Close</button>
        </div>
        <div class="draw-toolbar">
          <div class="draw-palette" role="radiogroup" aria-label="Color palette">
            <button class="draw-swatch active" type="button" data-color="#000000" aria-label="Black" aria-checked="true"></button>
            <button class="draw-swatch" type="button" data-color="#ffffff" aria-label="White" aria-checked="false"></button>
            <button class="draw-swatch" type="button" data-color="#ef4444" aria-label="Red" aria-checked="false"></button>
            <button class="draw-swatch" type="button" data-color="#3b82f6" aria-label="Blue" aria-checked="false"></button>
          </div>
          <div class="draw-palette-divider" aria-hidden="true"></div>
          <label class="draw-color-override" title="Custom color override">
            <span class="draw-color-override-label">Custom</span>
            <span class="draw-color-picker-wrap">
              <input class="draw-color-picker" type="color" value="#000000" aria-label="Custom color picker">
            </span>
          </label>
          <div class="draw-brush-size-wrap">
            <input id="draw-brush-size" class="draw-brush-size" type="range" min="1" max="64" value="6">
            <span class="draw-brush-size-value">6 px</span>
          </div>
          <div class="draw-tool-buttons">
            <button class="draw-eraser" type="button" aria-pressed="false">Eraser</button>
            <button class="draw-undo" type="button" disabled>Undo</button>
            <button class="draw-clear" type="button">Clear</button>
          </div>
        </div>
        <div class="draw-canvas-stage">
          <canvas class="draw-canvas" width="512" height="512"></canvas>
        </div>
        <div class="draw-footer">
          <p class="draw-status" aria-live="polite"></p>
          <button class="draw-save" type="button">Save to Gallery</button>
        </div>
      </div>
    </div>
  `;
}

function stubCanvasContext() {
  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    getImageData: vi.fn((x, y, w, h) => ({
      data: new Uint8ClampedArray(w * h * 4),
      height: h,
      width: w,
    })),
    lineCap: "",
    lineJoin: "",
    lineTo: vi.fn(),
    lineWidth: 0,
    moveTo: vi.fn(),
    putImageData: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: "",
  };

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
    bottom: 512,
    height: 512,
    left: 0,
    right: 512,
    top: 0,
    width: 512,
    x: 0,
    y: 0,
  });
  HTMLCanvasElement.prototype.toBlob = function (callback, type = "image/png") {
    callback(new Blob(["fake-drawing"], { type }));
  };

  return context;
}

function pointer(type, x = 0, y = 0) {
  const EventConstructor = window.PointerEvent || window.Event;
  const event = new EventConstructor(type, { bubbles: true });
  Object.defineProperties(event, {
    clientX: { value: x },
    clientY: { value: y },
    pointerId: { value: 1 },
  });
  return event;
}

describe("setupDrawPad", () => {
  let ctx;

  beforeEach(() => {
    renderDrawPadWorkspace();
    ctx = stubCanvasContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("opens and closes the draw pad overlay", () => {
    const drawPad = setupDrawPad(document);
    const toggle = document.querySelector(".draw-toggle");
    const overlay = document.querySelector(".draw-overlay");
    const closeBtn = document.querySelector(".draw-close");

    expect(overlay.hidden).toBe(true);
    expect(drawPad.isOpen()).toBe(false);

    toggle.click();
    expect(overlay.hidden).toBe(false);
    expect(drawPad.isOpen()).toBe(true);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 512, 512);

    closeBtn.click();
    expect(overlay.hidden).toBe(true);
    expect(drawPad.isOpen()).toBe(false);
  });

  it("changes current color when clicking swatches and adjusts color picker", () => {
    setupDrawPad(document);
    document.querySelector(".draw-toggle").click();

    const redSwatch = document.querySelector('.draw-swatch[data-color="#ef4444"]');
    const colorPicker = document.querySelector(".draw-color-picker");
    const colorOverride = document.querySelector(".draw-color-override");

    expect(redSwatch.style.backgroundColor).toBe("rgb(239, 68, 68)");

    redSwatch.click();
    expect(redSwatch.classList.contains("active")).toBe(true);
    expect(redSwatch.getAttribute("aria-checked")).toBe("true");
    expect(colorPicker.value).toBe("#ef4444");
    expect(colorOverride.classList.contains("active")).toBe(false);
  });

  it("updates custom color through color picker input and highlights color override", () => {
    setupDrawPad(document);
    document.querySelector(".draw-toggle").click();

    const colorPicker = document.querySelector(".draw-color-picker");
    const colorOverride = document.querySelector(".draw-color-override");

    // Setting to a preset color highlights matching swatch
    colorPicker.value = "#3b82f6";
    colorPicker.dispatchEvent(new Event("input"));

    const blueSwatch = document.querySelector('.draw-swatch[data-color="#3b82f6"]');
    expect(blueSwatch.classList.contains("active")).toBe(true);
    expect(colorOverride.classList.contains("active")).toBe(false);

    // Setting to a custom color not in palette activates color override
    colorPicker.value = "#123456";
    colorPicker.dispatchEvent(new Event("input"));
    expect(blueSwatch.classList.contains("active")).toBe(false);
    expect(colorOverride.classList.contains("active")).toBe(true);
  });

  it("adjusts brush size and updates label", () => {
    setupDrawPad(document);
    document.querySelector(".draw-toggle").click();

    const sizeInput = document.querySelector(".draw-brush-size");
    const sizeValue = document.querySelector(".draw-brush-size-value");

    sizeInput.value = "16";
    sizeInput.dispatchEvent(new Event("input"));

    expect(sizeValue.textContent).toBe("16 px");
  });

  it("toggles eraser mode and restores drawing mode", () => {
    setupDrawPad(document);
    document.querySelector(".draw-toggle").click();

    const eraserBtn = document.querySelector(".draw-eraser");
    expect(eraserBtn.getAttribute("aria-pressed")).toBe("false");

    eraserBtn.click();
    expect(eraserBtn.getAttribute("aria-pressed")).toBe("true");

    // Clicking a color swatch exits eraser mode
    const redSwatch = document.querySelector('.draw-swatch[data-color="#ef4444"]');
    redSwatch.click();
    expect(eraserBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("draws strokes on pointerdown and pointermove", () => {
    setupDrawPad(document);
    document.querySelector(".draw-toggle").click();

    const canvas = document.querySelector(".draw-canvas");
    canvas.dispatchEvent(pointer("pointerdown", 100, 100));

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalledWith(100, 100, 3, 0, Math.PI * 2);

    canvas.dispatchEvent(pointer("pointermove", 120, 120));

    expect(ctx.lineTo).toHaveBeenCalledWith(120, 120);
    expect(ctx.stroke).toHaveBeenCalled();

    canvas.dispatchEvent(pointer("pointerup"));

    // Moving after pointerup should not draw
    ctx.stroke.mockClear();
    canvas.dispatchEvent(pointer("pointermove", 150, 150));
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it("supports undo and clear canvas", () => {
    setupDrawPad(document);
    document.querySelector(".draw-toggle").click();

    const canvas = document.querySelector(".draw-canvas");
    const undoBtn = document.querySelector(".draw-undo");
    const clearBtn = document.querySelector(".draw-clear");

    expect(undoBtn.disabled).toBe(true);

    // Draw one stroke
    canvas.dispatchEvent(pointer("pointerdown", 50, 50));
    canvas.dispatchEvent(pointer("pointerup"));

    expect(undoBtn.disabled).toBe(false);

    // Click Undo
    undoBtn.click();
    expect(ctx.putImageData).toHaveBeenCalled();
    expect(undoBtn.disabled).toBe(true);

    // Click Clear
    clearBtn.click();
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 512, 512);
    expect(undoBtn.disabled).toBe(false);
  });

  it("saves the drawing to the gallery via multipart upload", async () => {
    const refreshGallery = vi.fn(async () => {});
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        image: { filename: "import-12345.png" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    setupDrawPad(document, {
      csrfToken: "test-csrf",
      refreshGallery,
    });
    document.querySelector(".draw-toggle").click();

    const saveBtn = document.querySelector(".draw-save");
    saveBtn.click();

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/images/import-upload",
        expect.objectContaining({
          headers: {
            "X-CSRF-Token": "test-csrf",
          },
          method: "POST",
        }),
      );
    });

    expect(refreshGallery).toHaveBeenCalledOnce();
    expect(document.querySelector(".draw-overlay").hidden).toBe(true);
  });

  it("opens with an existing gallery figure and loads the image onto the canvas", () => {
    let createdImg = null;
    const drawPad = setupDrawPad(document, {
      imageFactory: () => {
        createdImg = {
          crossOrigin: "",
          naturalHeight: 400,
          naturalWidth: 400,
          src: "",
        };
        return createdImg;
      },
    });

    const figure = document.createElement("figure");
    figure.dataset.filename = "source.png";
    const img = document.createElement("img");
    img.src = "/images/source.png";
    figure.append(img);

    drawPad.open(figure);

    const overlay = document.querySelector(".draw-overlay");
    expect(overlay.hidden).toBe(false);
    expect(overlay.dataset.filename).toBe("source.png");
    expect(document.querySelector("#draw-title").textContent).toBe("Draw: source.png");
    expect(createdImg.src).toContain("/images/source.png");

    createdImg.onload();
    expect(ctx.drawImage).toHaveBeenCalledWith(createdImg, 0, 0, 400, 400);

    drawPad.close();
    expect(overlay.hidden).toBe(true);
    expect(overlay.dataset.filename).toBeUndefined();
  });

  it("saves the drawing to the gallery and invokes onSavedImage callback", async () => {
    const onSavedImage = vi.fn(async () => {});
    const refreshGallery = vi.fn(async () => {});
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        image: { filename: "import-12345.png" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    setupDrawPad(document, {
      csrfToken: "test-csrf",
      onSavedImage,
      refreshGallery,
    });
    document.querySelector(".draw-toggle").click();

    const saveBtn = document.querySelector(".draw-save");
    saveBtn.click();

    await vi.waitFor(() => {
      expect(onSavedImage).toHaveBeenCalledWith("import-12345.png");
    });
  });
});
