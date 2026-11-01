const AMBER = "#ffb547";
const INK = "#14100c";

// Draws the same bracketed boxes the server draws on uploaded photos,
// so live camera results look identical to saved ones.
// `faces` are rectangles in canvas CSS pixels, already ordered left to right.
export function drawFaces(ctx, faces) {
  ctx.save();
  ctx.lineCap = "round";
  faces.forEach((face, i) => {
    const { x, y, width: w, height: h } = face;
    const arm = Math.max(8, Math.min(w, h) * 0.25);

    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    ctx.lineWidth = 3;
    ctx.beginPath();
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([cx, cy, dx, dy]) => {
      ctx.moveTo(cx + dx * arm, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * arm);
    });
    ctx.stroke();

    const label = String(i + 1);
    ctx.font = "700 13px 'Manrope Variable', system-ui, sans-serif";
    const tagW = ctx.measureText(label).width + 12;
    const tagH = 20;
    const tagY = y - tagH >= 0 ? y - tagH : y;
    ctx.fillStyle = AMBER;
    ctx.fillRect(x, tagY, tagW, tagH);
    ctx.fillStyle = INK;
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + 6, tagY + tagH / 2 + 0.5);
  });
  ctx.restore();
}
