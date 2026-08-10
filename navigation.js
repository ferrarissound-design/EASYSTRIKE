const key = (x, z) => `${x},${z}`;

export function findPath(start, goal, isBlocked, options = {}) {
  const cell = options.cell || 2.5;
  const limit = options.limit || 18;
  const snap = value => Math.max(-limit, Math.min(limit, Math.round(value / cell) * cell));
  const startNode = { x: snap(start.x), z: snap(start.z) };
  const goalNode = { x: snap(goal.x), z: snap(goal.z) };
  const startKey = key(startNode.x, startNode.z);
  const goalKey = key(goalNode.x, goalNode.z);
  const open = new Map([[startKey, { ...startNode, cost: 0, score: 0 }]]);
  const cameFrom = new Map();
  const costs = new Map([[startKey, 0]]);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  while (open.size) {
    const current = [...open.values()].sort((a, b) => a.score - b.score)[0];
    const currentKey = key(current.x, current.z);
    open.delete(currentKey);
    if (currentKey === goalKey) {
      const path = [];
      let cursor = currentKey;
      while (cursor !== startKey && cameFrom.has(cursor)) {
        const [x, z] = cursor.split(',').map(Number);
        path.unshift({ x, z });
        cursor = cameFrom.get(cursor);
      }
      return path;
    }

    for (const [dx, dz] of directions) {
      const x = current.x + dx * cell;
      const z = current.z + dz * cell;
      if (Math.abs(x) > limit || Math.abs(z) > limit || isBlocked(x, z)) continue;
      const nextKey = key(x, z);
      const cost = current.cost + (dx && dz ? 1.414 : 1);
      if (cost >= (costs.get(nextKey) ?? Infinity)) continue;
      costs.set(nextKey, cost);
      cameFrom.set(nextKey, currentKey);
      const heuristic = Math.hypot(goalNode.x - x, goalNode.z - z) / cell;
      open.set(nextKey, { x, z, cost, score: cost + heuristic });
    }
  }
  return [];
}
