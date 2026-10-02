export function pointerCanvasPosition(event, rect, canvasWidth, canvasHeight) {
  if (
    !event ||
    !rect ||
    rect.width <= 0 ||
    rect.height <= 0 ||
    !canvasWidth ||
    !canvasHeight
  ) {
    return null;
  }
  const x = ((event.clientX - rect.left) / rect.width) * canvasWidth;
  const y = ((event.clientY - rect.top) / rect.height) * canvasHeight;
  return {
    x: Math.max(0, Math.min(canvasWidth, x)),
    y: Math.max(0, Math.min(canvasHeight, y)),
  };
}

export function initializeCanvas(context, width, height, backgroundColor = "#ffffff") {
  if (!context || !width || !height) {
    return;
  }
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, width, height);
}

export function drawDot(context, point, options = {}) {
  if (!context || !point) {
    return;
  }
  const {
    backgroundColor = "#ffffff",
    color = "#000000",
    isEraser = false,
    size = 6,
  } = options;
  const radius = Math.max(size / 2, 0.5);

  context.beginPath();
  context.fillStyle = isEraser ? backgroundColor : color;
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();
}

export function drawLineSegment(context, fromPoint, toPoint, options = {}) {
  if (!context || !fromPoint || !toPoint) {
    return;
  }
  const {
    backgroundColor = "#ffffff",
    color = "#000000",
    isEraser = false,
    size = 6,
  } = options;

  context.beginPath();
  context.strokeStyle = isEraser ? backgroundColor : color;
  context.lineWidth = size;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.moveTo(fromPoint.x, fromPoint.y);
  context.lineTo(toPoint.x, toPoint.y);
  context.stroke();
}

export function createHistoryStack(maxSnapshots = 20) {
  const stack = [];

  return {
    canUndo() {
      return stack.length > 0;
    },
    clear() {
      stack.length = 0;
    },
    pop() {
      if (stack.length === 0) {
        return null;
      }
      return stack.pop();
    },
    push(item) {
      if (item === undefined || item === null) {
        return;
      }
      if (stack.length >= maxSnapshots) {
        stack.shift();
      }
      stack.push(item);
    },
    size() {
      return stack.length;
    },
  };
}
