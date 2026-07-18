export type Zone = "plaza" | "graphic" | "video";
export type MoveDirection = "up" | "down" | "left" | "right";
export type NpcId = "mentor" | "designer" | "director" | "editor";

export type Position = Readonly<{ x: number; y: number }>;

export type CollisionRect = Readonly<{
  id: string;
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}>;

export type KeyboardLike = Readonly<{ code: string; key: string }>;
export type WorldBounds = Readonly<{
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}>;

export const PLAYER_START: Position = { x: 50, y: 84 };
export const WORLD_RATIO = 16 / 9;
export const MOVE_SPEED = 17.5;
export const INTERACTION_DISTANCE = 7;
export const NPC_COLLISION_DISTANCE = 3.6;
export const WORLD_STATUS_INTERVAL = 80;

export const WORLD_BOUNDS: WorldBounds = {
  minX: 3.2,
  maxX: 96.8,
  minY: 25.5,
  maxY: 93,
} as const;

// The collider represents the character's feet, not the full sprite. This keeps
// the head free to overlap scenery while the feet remain on a walkable surface.
export const PLAYER_FOOTPRINT = { x: 1.15, y: 0.72 } as const;

// Coordinates are percentages of cozy-campus-world.webp (1672 × 941). The
// rectangles cover solid architecture, the fountain, planters and dense garden
// islands while leaving the visible stone paths connected.
export const WORLD_OBSTACLES: readonly CollisionRect[] = [
  {
    id: "main-building",
    label: "อาคารกลาง",
    x1: 33.8,
    y1: 1,
    x2: 66.2,
    y2: 31,
  },
  {
    id: "creative-lab",
    label: "Creative Lab",
    x1: 1.8,
    y1: 18.5,
    x2: 30.3,
    y2: 61.2,
  },
  {
    id: "video-studio",
    label: "Video Studio",
    x1: 68.6,
    y1: 18.5,
    x2: 98.2,
    y2: 61.2,
  },
  {
    id: "fountain",
    label: "น้ำพุ",
    x1: 42.2,
    y1: 46,
    x2: 57.8,
    y2: 64.4,
  },
  {
    id: "upper-left-planter",
    label: "แปลงต้นไม้ซ้ายบน",
    x1: 30.2,
    y1: 34.2,
    x2: 41.5,
    y2: 49.4,
  },
  {
    id: "upper-right-planter",
    label: "แปลงต้นไม้ขวาบน",
    x1: 58.5,
    y1: 34.2,
    x2: 69.7,
    y2: 49.4,
  },
  {
    id: "lower-left-outer-garden",
    label: "สวนซ้ายด้านนอก",
    x1: 3.2,
    y1: 67,
    x2: 20,
    y2: 86.5,
  },
  {
    id: "lower-left-inner-garden",
    label: "สวนซ้ายด้านใน",
    x1: 26,
    y1: 70.5,
    x2: 39.4,
    y2: 82.4,
  },
  {
    id: "lower-right-inner-garden",
    label: "สวนขวาด้านใน",
    x1: 60.6,
    y1: 70.5,
    x2: 74,
    y2: 82.4,
  },
  {
    id: "lower-right-outer-garden",
    label: "สวนขวาด้านนอก",
    x1: 80,
    y1: 67,
    x2: 96.8,
    y2: 86.5,
  },
] as const;

export const directionVectors: Record<
  MoveDirection,
  Readonly<{ x: number; y: number }>
> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const MOVE_DIRECTIONS: readonly MoveDirection[] = [
  "up",
  "down",
  "left",
  "right",
];

const movementControls: Record<string, MoveDirection> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  arrowup: "up",
  w: "up",
  ไ: "up",
  arrowdown: "down",
  s: "down",
  ห: "down",
  arrowleft: "left",
  a: "left",
  ฟ: "left",
  arrowright: "right",
  d: "right",
  ก: "right",
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const distance = (a: Position, b: Position) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const arraysEqual = (left: number[], right: number[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

export const normalizeProgress = (
  storedIds: readonly string[],
  orderedMissionIds: readonly string[],
) => {
  const stored = new Set(storedIds);
  const normalized: string[] = [];
  for (const missionId of orderedMissionIds) {
    if (!stored.has(missionId)) break;
    normalized.push(missionId);
  }
  return normalized;
};

export const getMovementDirection = (event: KeyboardLike) =>
  movementControls[event.code] ??
  movementControls[event.key.toLocaleLowerCase("th-TH")];

export const isInteractionKey = (event: KeyboardLike) => {
  const key = event.key.toLocaleLowerCase("th-TH");
  return event.code === "KeyE" || key === "e" || key === "ำ";
};

export const getMovementVector = (
  activeDirections: Iterable<MoveDirection>,
) => {
  let x = 0;
  let y = 0;
  for (const direction of activeDirections) {
    x += directionVectors[direction].x;
    y += directionVectors[direction].y;
  }
  const magnitude = Math.hypot(x, y);
  if (magnitude === 0) return { x: 0, y: 0, magnitude: 0 };
  return { x: x / magnitude, y: y / magnitude, magnitude };
};

export const getJoystickDirections = (
  x: number,
  y: number,
  deadZone = 0.22,
): MoveDirection[] => {
  const directions: MoveDirection[] = [];
  if (x <= -deadZone) directions.push("left");
  if (x >= deadZone) directions.push("right");
  if (y <= -deadZone) directions.push("up");
  if (y >= deadZone) directions.push("down");
  return directions;
};

export const isInsideObstacle = (
  position: Position,
  obstacles: readonly CollisionRect[] = WORLD_OBSTACLES,
) =>
  obstacles.some(
    (obstacle) =>
      position.x + PLAYER_FOOTPRINT.x >= obstacle.x1 &&
      position.x - PLAYER_FOOTPRINT.x <= obstacle.x2 &&
      position.y + PLAYER_FOOTPRINT.y >= obstacle.y1 &&
      position.y - PLAYER_FOOTPRINT.y <= obstacle.y2,
  );

export const canOccupyPosition = (
  position: Position,
  npcPositions: readonly Position[] = [],
  obstacles: readonly CollisionRect[] = WORLD_OBSTACLES,
  bounds: WorldBounds = WORLD_BOUNDS,
) => {
  if (
    position.x < bounds.minX ||
    position.x > bounds.maxX ||
    position.y < bounds.minY ||
    position.y > bounds.maxY ||
    isInsideObstacle(position, obstacles)
  ) {
    return false;
  }
  return npcPositions.every(
    (npcPosition) =>
      distance(position, npcPosition) >= NPC_COLLISION_DISTANCE,
  );
};

export const resolveMovement = (
  current: Position,
  dx: number,
  dy: number,
  npcPositions: readonly Position[] = [],
  obstacles: readonly CollisionRect[] = WORLD_OBSTACLES,
  bounds: WorldBounds = WORLD_BOUNDS,
): Position => {
  const proposedX = clamp(
    current.x + dx,
    bounds.minX,
    bounds.maxX,
  );
  let next: Position = { x: proposedX, y: current.y };
  if (!canOccupyPosition(next, npcPositions, obstacles, bounds)) {
    next = current;
  }

  const proposedY = clamp(
    next.y + dy,
    bounds.minY,
    bounds.maxY,
  );
  const verticalCandidate: Position = { x: next.x, y: proposedY };
  if (canOccupyPosition(verticalCandidate, npcPositions, obstacles, bounds)) {
    next = verticalCandidate;
  }
  return next;
};

export const getZoneForPosition = (position: Position): Zone =>
  position.x < 39 ? "graphic" : position.x > 61 ? "video" : "plaza";

// Player and NPC sprites must share one depth scale. A larger foot-Y appears
// in front; using different bases is what caused the old overlap bug.
export const getDepthIndex = (position: Position) =>
  100 + Math.round(position.y);
