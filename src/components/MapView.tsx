import { useEffect, useRef } from "react";
import type { MapMouseEvent } from "maplibre-gl";
import { addBuildingLayer } from "../map/buildingLayer";
import { SCENE_ORIGIN } from "../map/coordinateUtils";
import { initMap } from "../map/initMap";
import { pickNearestObject, SELECTION_THRESHOLD_PX } from "../map/picking";
import { ThreeObjectsLayer } from "../map/threeLayer";
import { createMapObject, type MapObject, type ObjectType } from "../types/mapObject";
import { useObjectsStore } from "../state/objectsStore";

type MapViewProps = {
  addMode: boolean;
  objects: MapObject[];
  selectedId: string | null;
  selectedType: ObjectType;
  onSelectObject: (id: string | null) => void;
};

type InteractionSnapshot = {
  addMode: boolean;
  objects: MapObject[];
  selectedType: ObjectType;
};

export function MapView({
  addMode,
  objects,
  selectedId,
  selectedType,
  onSelectObject,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<InteractionSnapshot>({
    addMode,
    objects,
    selectedType,
  });
  const layerRef = useRef<ThreeObjectsLayer | null>(null);
  const { addObject } = useObjectsStore();

  useEffect(() => {
    interactionRef.current = {
      addMode,
      objects,
      selectedType,
    };
  }, [addMode, objects, selectedType]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const map = initMap(containerRef.current);
    const threeLayer = new ThreeObjectsLayer(SCENE_ORIGIN);
    layerRef.current = threeLayer;

    const syncVisuals = () => {
      addBuildingLayer(map);
      if (!map.getLayer(threeLayer.id)) {
        map.addLayer(threeLayer);
      }
      threeLayer.setObjects(interactionRef.current.objects, selectedId);
    };

    const handleMapClick = (event: MapMouseEvent) => {
      const state = interactionRef.current;

      if (state.addMode) {
        const nextObject = createMapObject({
          type: state.selectedType,
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
        });
        addObject(nextObject);
        return;
      }

      const hitId = pickNearestObject(
        map,
        state.objects,
        event.point,
        SELECTION_THRESHOLD_PX,
      );
      onSelectObject(hitId);
    };

    map.on("load", syncVisuals);
    map.on("click", handleMapClick);

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.off("load", syncVisuals);
      map.off("click", handleMapClick);
      map.remove();
      layerRef.current = null;
    };
  }, [addObject, onSelectObject]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) {
      return;
    }

    layer.setObjects(objects, selectedId);

    const mapCanvas = layer.getMapCanvas();
    if (mapCanvas) {
      mapCanvas.style.cursor = addMode ? "crosshair" : "grab";
    }
  }, [addMode, objects, selectedId]);

  return (
    <div className="map-stage">
      <div ref={containerRef} className="map-root" />
    </div>
  );
}
