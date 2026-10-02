import { describe, expect, it, vi } from "vitest";

import {
  createHistoryStack,
  drawDot,
  drawLineSegment,
  initializeCanvas,
  pointerCanvasPosition,
} from "../../src/imagegen/frontend/draw-pad-operations.js";

describe("draw pad operations", () => {
  it("maps client pointer coordinates to canvas space", () => {
    const rect = { left: 50, top: 100, width: 400, height: 400 };
    const position = pointerCanvasPosition(
      { clientX: 150, clientY: 200 },
      rect,
      512,
      512,
    );

    expect(position).toEqual({ x: 128, y: 128 });
  });

  it("handles null or invalid rects safely", () => {
    expect(
      pointerCanvasPosition({ clientX: 10, clientY: 10 }, null, 512, 512),
    ).toBeNull();
    expect(
      pointerCanvasPosition(
        { clientX: 10, clientY: 10 },
        { left: 0, top: 0, width: 0, height: 100 },
        512,
        512,
      ),
    ).toBeNull();
  });

  it("initializes canvas with a filled background", () => {
    const context = {
      fillStyle: "",
      fillRect: vi.fn(),
    };

    initializeCanvas(context, 512, 512, "#ffffff");

    expect(context.fillStyle).toBe("#ffffff");
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 512, 512);
  });

  it("draws a single dot with rounded stroke", () => {
    const context = {
      arc: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      fillStyle: "",
    };

    drawDot(context, { x: 50, y: 50 }, { color: "#ff0000", size: 8 });

    expect(context.beginPath).toHaveBeenCalled();
    expect(context.fillStyle).toBe("#ff0000");
    expect(context.arc).toHaveBeenCalledWith(50, 50, 4, 0, Math.PI * 2);
    expect(context.fill).toHaveBeenCalled();
  });

  it("draws a line segment between points", () => {
    const context = {
      beginPath: vi.fn(),
      lineCap: "",
      lineJoin: "",
      lineWidth: 0,
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: "",
    };

    drawLineSegment(
      context,
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { color: "#0000ff", size: 6 },
    );

    expect(context.beginPath).toHaveBeenCalled();
    expect(context.strokeStyle).toBe("#0000ff");
    expect(context.lineWidth).toBe(6);
    expect(context.lineCap).toBe("round");
    expect(context.lineJoin).toBe("round");
    expect(context.moveTo).toHaveBeenCalledWith(10, 20);
    expect(context.lineTo).toHaveBeenCalledWith(30, 40);
    expect(context.stroke).toHaveBeenCalled();
  });

  it("supports eraser mode by drawing background color or composite operation", () => {
    const context = {
      beginPath: vi.fn(),
      lineCap: "",
      lineJoin: "",
      lineWidth: 0,
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: "",
    };

    drawLineSegment(
      context,
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { color: "#000000", isEraser: true, backgroundColor: "#ffffff", size: 10 },
    );

    expect(context.strokeStyle).toBe("#ffffff");
    expect(context.lineWidth).toBe(10);
  });

  it("manages history stack for undo operations", () => {
    const history = createHistoryStack(3);
    expect(history.canUndo()).toBe(false);

    history.push("snap-1");
    history.push("snap-2");
    history.push("snap-3");
    history.push("snap-4");

    // Overflow capped at 3
    expect(history.size()).toBe(3);
    expect(history.canUndo()).toBe(true);

    expect(history.pop()).toBe("snap-4");
    expect(history.pop()).toBe("snap-3");
    expect(history.pop()).toBe("snap-2");
    expect(history.pop()).toBeNull();
    expect(history.canUndo()).toBe(false);
  });
});
