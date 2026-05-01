export type GridPosition = {
  x: number;
  y: number;
};

export type PathNode = GridPosition & {
  parent: GridPosition | null;
};

export type PathResult = {
  found: boolean;
  path: GridPosition[];
};
