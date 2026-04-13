import maplibregl from "maplibre-gl";
import { INITIAL_VIEW } from "./initMap";

export const SCENE_ORIGIN = INITIAL_VIEW.center;

export type ScenePosition = {
  east: number;
  north: number;
  up: number;
};

export function calculateDistanceMercatorToMeters(
  from: maplibregl.MercatorCoordinate,
  to: maplibregl.MercatorCoordinate,
) {
  const mercatorPerMeter = from.meterInMercatorCoordinateUnits();

  return {
    east: (to.x - from.x) / mercatorPerMeter,
    north: (from.y - to.y) / mercatorPerMeter,
  };
}

export function lngLatToScenePosition(
  origin: maplibregl.MercatorCoordinate,
  longitude: number,
  latitude: number,
  altitude: number,
): ScenePosition {
  const target = maplibregl.MercatorCoordinate.fromLngLat({ lng: longitude, lat: latitude }, altitude);
  const { east, north } = calculateDistanceMercatorToMeters(origin, target);

  return {
    east,
    north,
    up: altitude,
  };
}

