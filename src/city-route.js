const mapWidth = 720;
const svgNamespace = 'http://www.w3.org/2000/svg';

function element(tag, attributes) {
  const node = document.createElementNS(svgNamespace, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

// Equirectangular projection, shared with the land outline in city-world.svg.
function point({longitude, latitude}) {
  return {x: (longitude + 180) * 2, y: (90 - latitude) * 2};
}

function legPaths(from, to) {
  let endX = to.x;
  // Continue across the opposite map edge when crossing the date line.
  if (endX - from.x > mapWidth / 2) endX -= mapWidth;
  if (from.x - endX > mapWidth / 2) endX += mapWidth;
  const offsets = [0];
  if (endX < 0) offsets.push(mapWidth);
  if (endX > mapWidth) offsets.push(-mapWidth);
  const rise = Math.min(64, 14 + Math.abs(endX - from.x) * .17);
  const peak = Math.max(12, Math.min(from.y, to.y) - rise);
  return offsets.map(offset =>
    `M ${from.x + offset} ${from.y} Q ${(from.x + endX) / 2 + offset} ${peak} ${endX + offset} ${to.y}`
  );
}

export function renderRoute(svg, visited) {
  const points = visited.map(point);
  const latest = points.length - 1;
  svg.replaceChildren();
  let jump = [];
  for (let index = 1; index < points.length; index += 1) {
    const paths = legPaths(points[index - 1], points[index]);
    const current = index === latest;
    for (const d of paths) {
      svg.append(element('path', {d, class: current ? 'route-leg current' : 'route-leg'}));
    }
    if (current) jump = paths;
  }

  points.forEach(({x, y}, index) => {
    const current = index === latest;
    const marker = element('g', {transform: `translate(${x} ${y})`, class: current ? 'route-stop current' : 'route-stop'});
    marker.append(element('circle', {r: current ? 10 : 4.5}));
    if (current) {
      const number = element('text', {y: '.35em'});
      number.textContent = String(index + 1);
      marker.append(number);
    }
    svg.append(marker);
  });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!latest) {
    const {x, y} = points[0];
    jump = [`M ${x} ${y - 30} Q ${x - 18} ${y - 16} ${x} ${y}`];
  }
  for (const path of jump) {
    const traveller = element('circle', {r: 6, class: 'route-traveller'});
    const motion = element('animateMotion', {path, dur: latest ? '.95s' : '.55s', begin: 'indefinite', fill: 'freeze'});
    if (typeof motion.beginElement !== 'function') return;
    motion.addEventListener('endEvent', () => traveller.remove(), {once: true});
    traveller.append(motion);
    svg.append(traveller);
    motion.beginElement();
  }
}
