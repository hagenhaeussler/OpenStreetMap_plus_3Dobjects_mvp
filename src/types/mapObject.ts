export const OBJECT_TYPES = ["sphere", "box", "cone", "cylinder", "torusKnot"] as const;

export type ObjectType = (typeof OBJECT_TYPES)[number];

export type Rotation3D = {
  x: number;
  y: number;
  z: number;
};

export type MapObject = {
  altitude: number;
  color: string;
  id: string;
  latitude: number;
  longitude: number;
  rotation: Rotation3D;
  scale: number;
  type: ObjectType;
};

export const OBJECT_LABELS: Record<ObjectType, string> = {
  sphere: "Sphere",
  box: "Box",
  cone: "Cone",
  cylinder: "Cylinder",
  torusKnot: "Torus knot",
};

const OBJECT_DEFAULTS: Record<
  ObjectType,
  Pick<MapObject, "altitude" | "color" | "scale">
> = {
  sphere: {
    altitude: 26,
    color: "#ff8c42",
    scale: 18,
  },
  box: {
    altitude: 22,
    color: "#0f9d8a",
    scale: 18,
  },
  cone: {
    altitude: 24,
    color: "#ff5f7a",
    scale: 20,
  },
  cylinder: {
    altitude: 22,
    color: "#4d8dff",
    scale: 19,
  },
  torusKnot: {
    altitude: 30,
    color: "#f0c34e",
    scale: 16,
  },
};

type CreateMapObjectInput = {
  latitude: number;
  longitude: number;
  type: ObjectType;
};

function createId() {
  if ("randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `object-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

export function createMapObject({ latitude, longitude, type }: CreateMapObjectInput): MapObject {
  const defaults = OBJECT_DEFAULTS[type];

  return {
    id: createId(),
    type,
    longitude,
    latitude,
    altitude: defaults.altitude,
    scale: defaults.scale,
    color: defaults.color,
    rotation: {
      x: 0,
      y: Math.random() * Math.PI * 2,
      z: 0,
    },
  };
}

export function isMapObject(value: unknown): value is MapObject {
  if (!value || typeof value !== "object") {
    return false;
  }

  const object = value as Partial<MapObject>;

  return (
    typeof object.id === "string" &&
    typeof object.longitude === "number" &&
    typeof object.latitude === "number" &&
    typeof object.altitude === "number" &&
    typeof object.scale === "number" &&
    typeof object.color === "string" &&
    typeof object.type === "string" &&
    OBJECT_TYPES.includes(object.type as ObjectType) &&
    !!object.rotation &&
    typeof object.rotation.x === "number" &&
    typeof object.rotation.y === "number" &&
    typeof object.rotation.z === "number"
  );
}

