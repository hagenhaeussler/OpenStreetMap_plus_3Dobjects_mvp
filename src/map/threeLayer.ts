import maplibregl, { type CustomRenderMethodInput, type LngLatLike, type Map as MapLibreMap } from "maplibre-gl";
import * as THREE from "three";
import { lngLatToScenePosition } from "./coordinateUtils";
import { type MapObject, type ObjectType } from "../types/mapObject";

type MeshRecord = {
  baseRotationY: number;
  baseScale: number;
  baseUp: number;
  group: THREE.Group;
  mesh: THREE.Mesh;
  phase: number;
  spinSpeed: number;
};

const AMBIENT_LIGHT_INTENSITY = 1.45;
const FLOAT_AMPLITUDE = 1.2;
const FLOAT_SPEED = 0.85;
const SELECTION_PULSE_SCALE = 0.14;

function colorKey(color: string, selected: boolean) {
  return `${color}:${selected ? "selected" : "base"}`;
}

function createGeometry(type: ObjectType) {
  switch (type) {
    case "sphere":
      return new THREE.SphereGeometry(0.7, 26, 26);
    case "box":
      return new THREE.BoxGeometry(1.15, 1.15, 1.15);
    case "cone":
      return new THREE.ConeGeometry(0.72, 1.6, 24);
    case "cylinder":
      return new THREE.CylinderGeometry(0.58, 0.58, 1.5, 24);
    case "torusKnot":
      return new THREE.TorusKnotGeometry(0.58, 0.18, 96, 16);
  }
}

function materialFor(color: string, selected: boolean) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: selected ? 0.18 : 0.26,
    metalness: selected ? 0.55 : 0.42,
    emissive: selected ? new THREE.Color("#f8f1a1") : new THREE.Color("#000000"),
    emissiveIntensity: selected ? 0.75 : 0,
  });
}

export class ThreeObjectsLayer implements maplibregl.CustomLayerInterface {
  readonly id = "three-objects-layer";
  readonly type = "custom" as const;
  readonly renderingMode = "3d" as const;

  private readonly anchorMercator: maplibregl.MercatorCoordinate;
  private readonly camera = new THREE.Camera();
  private readonly clock = new THREE.Clock();
  private readonly geometries = new globalThis.Map<ObjectType, THREE.BufferGeometry>();
  private readonly materials = new globalThis.Map<string, THREE.MeshStandardMaterial>();
  private readonly meshes = new globalThis.Map<string, MeshRecord>();
  private readonly scene = new THREE.Scene();

  private map: MapLibreMap | null = null;
  private objects: MapObject[] = [];
  private renderer: THREE.WebGLRenderer | null = null;
  private selectedId: string | null = null;

  constructor(anchor: LngLatLike) {
    this.anchorMercator = maplibregl.MercatorCoordinate.fromLngLat(anchor);
  }

  getMapCanvas() {
    return this.map?.getCanvas() ?? null;
  }

  onAdd(map: MapLibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.map = map;

    this.scene.rotateX(Math.PI / 2);
    this.scene.scale.multiply(new THREE.Vector3(1, 1, -1));

    const ambientLight = new THREE.AmbientLight("#f4f8ff", AMBIENT_LIGHT_INTENSITY);
    const keyLight = new THREE.DirectionalLight("#ffffff", 1.7);
    const rimLight = new THREE.DirectionalLight("#78d7ff", 1.1);

    keyLight.position.set(48, 72, -34).normalize();
    rimLight.position.set(-34, 32, 46).normalize();

    this.scene.add(ambientLight, keyLight, rimLight);

    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.syncObjects();
  }

  render(gl: WebGLRenderingContext | WebGL2RenderingContext, args: CustomRenderMethodInput) {
    if (!this.renderer) {
      return;
    }

    const elapsed = this.clock.getElapsedTime();
    const sceneScale = this.anchorMercator.meterInMercatorCoordinateUnits();

    for (const [id, record] of this.meshes) {
      const isSelected = id === this.selectedId;
      const floatOffset = Math.sin(elapsed * FLOAT_SPEED + record.phase) * FLOAT_AMPLITUDE;
      const pulseScale = isSelected ? 1 + SELECTION_PULSE_SCALE + Math.sin(elapsed * 5.2) * 0.03 : 1;

      record.group.position.y = record.baseUp + floatOffset;
      record.group.rotation.y = record.baseRotationY + elapsed * record.spinSpeed;
      record.group.scale.setScalar(record.baseScale * pulseScale);
    }

    const modelMatrix = new THREE.Matrix4()
      .makeTranslation(this.anchorMercator.x, this.anchorMercator.y, this.anchorMercator.z)
      .scale(new THREE.Vector3(sceneScale, -sceneScale, sceneScale));
    const projectionMatrix = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);

    this.camera.projectionMatrix = projectionMatrix.multiply(modelMatrix);
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.map?.triggerRepaint();
  }

  onRemove() {
    for (const record of this.meshes.values()) {
      this.scene.remove(record.group);
    }

    this.meshes.clear();

    for (const geometry of this.geometries.values()) {
      geometry.dispose();
    }
    this.geometries.clear();

    for (const material of this.materials.values()) {
      material.dispose();
    }
    this.materials.clear();

    this.renderer?.dispose();
    this.renderer = null;
    this.map = null;
  }

  setObjects(objects: MapObject[], selectedId: string | null) {
    this.objects = objects;
    this.selectedId = selectedId;
    this.syncObjects();
    this.map?.triggerRepaint();
  }

  private geometryFor(type: ObjectType) {
    const existing = this.geometries.get(type);
    if (existing) {
      return existing;
    }

    const geometry = createGeometry(type);
    this.geometries.set(type, geometry);
    return geometry;
  }

  private materialFor(color: string, selected: boolean) {
    const key = colorKey(color, selected);
    const existing = this.materials.get(key);
    if (existing) {
      return existing;
    }

    const material = materialFor(color, selected);
    this.materials.set(key, material);
    return material;
  }

  private createMeshRecord(object: MapObject) {
    const group = new THREE.Group();
    const geometry = this.geometryFor(object.type);
    const mesh = new THREE.Mesh(geometry, this.materialFor(object.color, false));

    mesh.castShadow = false;
    mesh.receiveShadow = false;

    group.add(mesh);
    this.scene.add(group);

    const record: MeshRecord = {
      baseRotationY: object.rotation.y,
      baseScale: object.scale,
      baseUp: object.altitude,
      group,
      mesh,
      phase: Math.random() * Math.PI * 2,
      spinSpeed: object.type === "torusKnot" ? 0.22 : 0.11,
    };

    this.meshes.set(object.id, record);
    return record;
  }

  private updateMeshRecord(record: MeshRecord, object: MapObject) {
    const position = lngLatToScenePosition(
      this.anchorMercator,
      object.longitude,
      object.latitude,
      object.altitude,
    );

    record.group.position.set(position.east, position.up, position.north);
    record.group.rotation.set(object.rotation.x, object.rotation.y, object.rotation.z);
    record.group.scale.setScalar(object.scale);

    record.baseRotationY = object.rotation.y;
    record.baseScale = object.scale;
    record.baseUp = object.altitude;
    record.mesh.geometry = this.geometryFor(object.type);
    record.mesh.material = this.materialFor(object.color, object.id === this.selectedId);
  }

  private syncObjects() {
    if (!this.map && !this.renderer) {
      return;
    }

    const nextIds = new Set(this.objects.map((object) => object.id));

    for (const [id, record] of this.meshes) {
      if (!nextIds.has(id)) {
        this.scene.remove(record.group);
        this.meshes.delete(id);
      }
    }

    for (const object of this.objects) {
      const record = this.meshes.get(object.id) ?? this.createMeshRecord(object);
      this.updateMeshRecord(record, object);
    }
  }
}
