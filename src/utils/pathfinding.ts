export interface Point {
  x: number;
  y: number;
}

export function findPath(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  isWalkableFn: (x: number, y: number) => boolean,
  mapW: number,
  mapH: number,
  allowAdjacent = false
): Point[] | null {
  if (startX === targetX && startY === targetY) {
    return [];
  }

  // If allowAdjacent and we're already adjacent
  if (allowAdjacent && Math.abs(startX - targetX) + Math.abs(startY - targetY) === 1) {
    return [];
  }

  const nodeKey = (x: number, y: number) => `${x},${y}`;
  const h = (x1: number, y1: number, x2: number, y2: number) => {
    // Manhattan distance
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  };

  interface Node {
    x: number;
    y: number;
    g: number;
    f: number;
  }

  const openList: Node[] = [];
  const openSet = new Map<string, Node>();
  const closedSet = new Set<string>();
  const cameFrom = new Map<string, Point>();

  const startNode: Node = {
    x: startX,
    y: startY,
    g: 0,
    f: h(startX, startY, targetX, targetY),
  };

  openList.push(startNode);
  openSet.set(nodeKey(startX, startY), startNode);

  // Maximum search step safeguard to avoid CPU freezing on huge inaccessible searches
  let iterations = 0;
  const maxIterations = 800;

  while (openList.length > 0 && iterations++ < maxIterations) {
    // Small optimization: extract min node
    let bestIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[bestIdx].f) {
        bestIdx = i;
      }
    }
    const current = openList.splice(bestIdx, 1)[0];
    const currKey = nodeKey(current.x, current.y);
    openSet.delete(currKey);

    if (allowAdjacent) {
      if (Math.abs(current.x - targetX) + Math.abs(current.y - targetY) === 1) {
        return reconstructPath(cameFrom, current);
      }
    } else if (current.x === targetX && current.y === targetY) {
      return reconstructPath(cameFrom, current);
    }

    closedSet.add(currKey);

    // 4 cardinal directions (reliable RimWorld pathing)
    const dirs: Point[] = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    for (const d of dirs) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      const nKey = nodeKey(nx, ny);

      if (nx < 0 || nx >= mapW || ny < 0 || ny >= mapH) continue;
      if (closedSet.has(nKey)) continue;

      const isTargetCell = nx === targetX && ny === targetY;
      const walkable = isWalkableFn(nx, ny) || (allowAdjacent && isTargetCell);

      if (!walkable) continue;

      const tentativeG = current.g + 1;
      const existing = openSet.get(nKey);

      if (!existing) {
        const neighborNode: Node = {
          x: nx,
          y: ny,
          g: tentativeG,
          f: tentativeG + h(nx, ny, targetX, targetY),
        };
        openList.push(neighborNode);
        openSet.set(nKey, neighborNode);
        cameFrom.set(nKey, { x: current.x, y: current.y });
      } else if (tentativeG < existing.g) {
        existing.g = tentativeG;
        existing.f = tentativeG + h(nx, ny, targetX, targetY);
        cameFrom.set(nKey, { x: current.x, y: current.y });
      }
    }
  }

  return null;
}

function reconstructPath(cameFrom: Map<string, Point>, endNode: { x: number; y: number }): Point[] {
  const path: Point[] = [];
  let curr: Point | undefined = { x: endNode.x, y: endNode.y };

  while (curr) {
    path.unshift(curr);
    curr = cameFrom.get(`${curr.x},${curr.y}`);
  }

  // Remove start node
  if (path.length > 0) {
    path.shift();
  }
  return path;
}
