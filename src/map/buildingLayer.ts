import type { FillExtrusionLayerSpecification, Map } from "maplibre-gl";

const BUILDING_LAYER_ID = "openfreemap-3d-buildings";
const OPEN_FREE_MAP_SOURCE_ID = "openfreemap";

function findFirstLabelLayerId(map: Map) {
  const layers = map.getStyle().layers ?? [];

  for (const layer of layers) {
    if (layer.type === "symbol" && "text-field" in (layer.layout ?? {})) {
      return layer.id;
    }
  }

  return undefined;
}

export function addBuildingLayer(map: Map) {
  if (map.getLayer(BUILDING_LAYER_ID)) {
    return;
  }

  if (!map.getSource(OPEN_FREE_MAP_SOURCE_ID)) {
    map.addSource(OPEN_FREE_MAP_SOURCE_ID, {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
    });
  }

  const layer: FillExtrusionLayerSpecification = {
    id: BUILDING_LAYER_ID,
    type: "fill-extrusion",
    source: OPEN_FREE_MAP_SOURCE_ID,
    "source-layer": "building",
    minzoom: 15,
    filter: ["!=", ["get", "hide_3d"], true],
    paint: {
      "fill-extrusion-color": [
        "interpolate",
        ["linear"],
        ["get", "render_height"],
        0,
        "#d6dde6",
        120,
        "#7aa8cf",
        260,
        "#4d6e8e",
      ],
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["zoom"],
        15,
        0,
        16,
        ["get", "render_height"],
      ],
      "fill-extrusion-base": [
        "case",
        [">=", ["zoom"], 16],
        ["get", "render_min_height"],
        0,
      ],
      "fill-extrusion-opacity": 0.92,
      "fill-extrusion-vertical-gradient": true,
    },
  };

  map.addLayer(layer, findFirstLabelLayerId(map));
}

