import type { Map, PointLike } from "maplibre-gl";
import type { MapObject } from "../types/mapObject";

export const SELECTION_THRESHOLD_PX = 30;

type ScreenPoint = {
  x: number;
  y: number;
};

function normalizePoint(point: PointLike): ScreenPoint {
  if (Array.isArray(point)) {
    return { x: point[0], y: point[1] };
  }

  return {
    x: point.x,
    y: point.y,
  };
}

export function pickNearestObject(
  map: Map,
  objects: MapObject[],
  point: PointLike,
  thresholdPx: number,
) {
  const target = normalizePoint(point);
  const thresholdSq = thresholdPx * thresholdPx;

  let closestId: string | null = null;
  let closestDistanceSq = Number.POSITIVE_INFINITY;

  for (const object of objects) {
    const projected = map.project([object.longitude, object.latitude]);
    const dx = projected.x - target.x;
    const dy = projected.y - target.y;
    const distanceSq = dx * dx + dy * dy;

    if (distanceSq <= thresholdSq && distanceSq < closestDistanceSq) {
      closestDistanceSq = distanceSq;
      closestId = object.id;
    }
  }

  return closestId;
}

