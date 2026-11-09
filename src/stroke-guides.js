import {pathLength, resamplePath} from './handwriting-core.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const badgeRadius = 24;
const inset = badgeRadius + 4;
const diagonal = Math.SQRT1_2;
const offsets = [
  [-diagonal, -diagonal], [0, -1], [-1, 0], [diagonal, -diagonal],
  [-diagonal, diagonal], [1, 0], [0, 1], [diagonal, diagonal],
];

function svgNode(tag, attributes = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function badgePosition(start, anchors, labels) {
  for (const radius of [46, 68, 92, 118, 152, 190]) {
    for (const [dx, dy] of offsets) {
      const point = [start[0] + dx * radius, start[1] + dy * radius];
      if (point.some(value => value < inset || value > 1024 - inset)) continue;
      if (anchors.some(anchor => distance(point, anchor) < 34)) continue;
      if (labels.some(label => distance(point, label) < 54)) continue;
      return point;
    }
  }
  return start.map(value => Math.max(inset, Math.min(1024 - inset, value - 46)));
}

function arrowAlong(points) {
  const length = pathLength(points);
  if (!length) return null;
  const samples = resamplePath(points, 33);
  const shaftSteps = Math.max(2, Math.min(15, Math.round(58 * 32 / length)));
  const shaft = samples.slice(-shaftSteps - 1);
  const tip = shaft.at(-1);
  const before = shaft.findLast(point => distance(point, tip) > 1);
  if (!before) return null;

  const span = distance(tip, before);
  const dx = (tip[0] - before[0]) / span;
  const dy = (tip[1] - before[1]) / span;
  const size = Math.min(23, Math.max(13, length / 3));
  const base = [tip[0] - dx * size, tip[1] - dy * size];
  const wing = size * .56;
  const head = [tip, [base[0] - dy * wing, base[1] + dx * wing], [base[0] + dy * wing, base[1] - dx * wing]];
  return {shaft, head};
}

export function createStrokeGuides(medians, placed) {
  const layer = svgNode('g', {class: 'stroke-guides', 'aria-hidden': 'true'});
  // The data's y-axis points up; SVG and the writing surface point down.
  const strokes = medians.map(median => median.map(([x, y]) => [x, 900 - y]));
  const starts = strokes.map(points => points[0]);
  const arrows = strokes.map(arrowAlong);
  const anchors = [...starts, ...arrows.flatMap(arrow => arrow?.head ?? [])];
  const active = strokes[placed];
  if (active) {
    const trace = svgNode('g', {class: 'handwriting-guide'});
    trace.append(svgNode('path', {d: active.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')}));
    layer.append(trace);
  }

  const labels = [];
  const guides = [];
  for (const [index, start] of starts.entries()) {
    const stateClass = index === placed ? ' is-current' : index < placed ? ' is-complete' : '';
    const guide = svgNode('g', {class: `stroke-guide${stateClass}`});
    const arrow = arrows[index];
    if (arrow) {
      guide.append(svgNode('polyline', {class: 'stroke-guide-arrow', points: arrow.shaft.join(' ')}));
      guide.append(svgNode('polygon', {class: 'stroke-guide-head', points: arrow.head.join(' ')}));
    }

    const [x, y] = badgePosition(start, anchors, labels);
    labels.push([x, y]);
    const [x1, y1] = start;
    guide.append(svgNode('line', {class: 'stroke-guide-leader', x1, y1, x2: x, y2: y}));
    guide.append(svgNode('circle', {class: 'stroke-guide-origin', cx: x1, cy: y1, r: index === placed ? 13 : 6}));
    guide.append(svgNode('circle', {class: 'stroke-guide-badge', cx: x, cy: y, r: badgeRadius}));
    const number = svgNode('text', {class: 'stroke-guide-number', x, y});
    number.textContent = index + 1;
    guide.append(number);
    guides.push(guide);
  }
  // Shared start points should show the current stroke's dot on top.
  const current = guides.splice(placed, 1);
  layer.append(...guides, ...current);
  return layer;
}
