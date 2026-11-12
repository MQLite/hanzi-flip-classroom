// The boat and the painted river use the same interpolated route.
export function riverPosition(points, index, progress) {
  const previous = points[Math.max(0, index - 1)];
  const start = points[index];
  const end = points[index + 1];
  const following = points[Math.min(points.length - 1, index + 2)];
  const squared = progress * progress;
  const cubed = squared * progress;
  return start.map((value, axis) => {
    const next = end[axis];
    const startTangent = (next - previous[axis]) / 2;
    const endTangent = (following[axis] - value) / 2;
    return (2 * cubed - 3 * squared + 1) * value + (cubed - 2 * squared + progress) * startTangent
      + (-2 * cubed + 3 * squared) * next + (cubed - squared) * endTangent;
  });
}

export function paintRiverMap(canvas, route, visited, showNumbers = false) {
  const {clientWidth: width, clientHeight: height} = canvas;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d');
  if (!context || !width || !height) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const yellow = route.id === 'yellow';
  const water = yellow ? '#b1864c' : '#308b9c';
  const scale = Math.min(width, height);

  // Offset hill silhouettes give the western highlands depth and leave the channel clear.
  const ridges = yellow ? [[.13,.40],[.25,.34],[.42,.70],[.52,.79]] : [[.12,.35],[.21,.28],[.30,.34],[.42,.78]];
  for (const [x, y] of ridges) {
    const size = scale * (x < .25 ? .22 : .15);
    context.beginPath();
    context.moveTo(x * width - size, y * height + size * .3);
    context.lineTo(x * width, y * height - size);
    context.lineTo(x * width + size * .7, y * height + size * .35);
    context.closePath();
    context.fillStyle = yellow ? '#a38c5e45' : '#65887946';
    context.fill();
    if (x < .25) {
      context.beginPath();
      context.moveTo(x * width - size * .31, y * height - size * .59);
      context.lineTo(x * width, y * height - size);
      context.lineTo(x * width + size * .23, y * height - size * .56);
      context.lineTo(x * width, y * height - size * .67);
      context.fillStyle = '#fff9e1b3';
      context.fill();
    }
  }

  const sea = context.createLinearGradient(width * .85, 0, width, 0);
  sea.addColorStop(0, '#76b7b6');
  sea.addColorStop(1, '#3b8caa');
  context.beginPath();
  context.moveTo(width * .91, 0);
  context.bezierCurveTo(width * .84, height * .38, width * .99, height * .62, width * .88, height);
  context.lineTo(width, height);
  context.lineTo(width, 0);
  context.closePath();
  context.fillStyle = sea;
  context.fill();

  function trace(end) {
    context.beginPath();
    context.moveTo(route.points[0][0] * width, route.points[0][1] * height);
    for (let index = 0; index < end; index++) {
      for (let sample = 1; sample <= 10; sample++) {
        const [x, y] = riverPosition(route.points, index, sample / 10);
        context.lineTo(x * width, y * height);
      }
    }
  }

  const channel = Math.max(10, scale * .055);
  context.lineJoin = context.lineCap = 'round';
  trace(route.points.length - 1);
  context.strokeStyle = yellow ? '#f4e3ab' : '#d7f1db';
  context.lineWidth = channel + 8;
  context.stroke();
  context.strokeStyle = water;
  context.lineWidth = channel;
  context.stroke();
  if (visited) {
    trace(visited);
    context.strokeStyle = '#fff8dfba';
    context.lineWidth = 2;
    context.stroke();
  }
  const markerRadius = Math.max(9, Math.min(14, scale * .047));
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `bold ${Math.round(markerRadius * 1.12)}px system-ui, sans-serif`;
  for (const [index, [x, y]] of route.points.entries()) {
    const numbered = showNumbers && index > 0;
    const px = x * width;
    const py = y * height;
    context.beginPath();
    context.arc(px, py, numbered ? markerRadius : index === visited + 1 ? 5 : 3, 0, 2 * Math.PI);
    context.fillStyle = numbered ? '#235a4c' : index === visited + 1 ? '#ffe7a1' : index <= visited ? '#ffffff' : '#fff5d98f';
    context.fill();
    if (numbered) {
      context.strokeStyle = '#fff8df';
      context.lineWidth = 1.5;
      context.stroke();
      context.fillStyle = '#fff';
      context.fillText(index, px, py);
    }
  }
}
