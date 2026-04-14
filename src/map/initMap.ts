import maplibregl from "maplibre-gl";

export const INITIAL_VIEW = {
  center: [-122.4012, 37.7927] as [number, number],
  zoom: 16.55,
  pitch: 72,
  bearing: -28,
};

export const OPEN_FREE_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function initMap(container: HTMLDivElement) {
  const map = new maplibregl.Map({
    container,
    style: OPEN_FREE_MAP_STYLE,
    center: INITIAL_VIEW.center,
    zoom: INITIAL_VIEW.zoom,
    pitch: INITIAL_VIEW.pitch,
    bearing: INITIAL_VIEW.bearing,
    dragRotate: true,
    pitchWithRotate: true,
    touchPitch: true,
    canvasContextAttributes: {
      antialias: true,
    },
    maxPitch: 85,
    minZoom: 12,
    maxZoom: 19.5,
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  map.dragRotate.enable();
  map.touchZoomRotate.enableRotation();

  return map;
}
