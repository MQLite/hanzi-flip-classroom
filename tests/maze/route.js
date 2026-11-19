import {expect} from '@playwright/test';

export async function mazeRoute(page) {
  return page.locator('[data-maze-cell]').evaluateAll(nodes => {
    const open = new Set(nodes.map(node => Number(node.dataset.mazeCell)));
    const queue = [[9]], seen = new Set([9]);
    for (const path of queue) {
      const last = path.at(-1);
      if (last === 71) return path;
      for (const next of [last - 9, last + 9, last - 1, last + 1]) {
        const distance = Math.abs(Math.floor(last / 9) - Math.floor(next / 9)) + Math.abs(last % 9 - next % 9);
        if (!open.has(next) || seen.has(next) || distance !== 1) continue;
        seen.add(next);
        queue.push([...path, next]);
      }
    }
    return [];
  });
}

export async function followMazeRoute(page, route, destination = route.at(-1)) {
  const scene = page.locator('#maze-scene');
  expect(route.length).toBeGreaterThan(2);
  for (let turns = 0; turns < route.length + 6; turns++) {
    await expect(scene).toHaveAttribute('data-motion', 'idle');
    const current = Number(await scene.getAttribute('data-avatar-cell'));
    if (current === destination) return;
    const next = route[route.indexOf(current) + 1];
    await page.locator(`[data-maze-cell="${next}"]`).click();
    await page.locator('#maze-confirm').click();
  }
  throw new Error(`Maze route did not reach ${destination}`);
}
