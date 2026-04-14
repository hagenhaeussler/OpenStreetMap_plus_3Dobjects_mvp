import maplibregl, { type CustomRenderMethodInput, type LngLatLike, type Map as MapLibreMap } from "maplibre-gl";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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
const DOWNTOWN_SF = {
  longitude: -122.4012,
  latitude: 37.7927,
};
const ALCATRAZ_ISLAND = {
  longitude: -122.4230,
  latitude: 37.8267,
};
const UC_BERKELEY_ROBOT_POSITIONS = [
  { longitude: -122.2626, latitude: 37.8689 },
  { longitude: -122.2614, latitude: 37.8689 },
  { longitude: -122.2602, latitude: 37.8689 },
  { longitude: -122.2590, latitude: 37.8689 },
  { longitude: -122.2578, latitude: 37.8689 },
  { longitude: -122.2626, latitude: 37.8701 },
  { longitude: -122.2614, latitude: 37.8701 },
  { longitude: -122.2602, latitude: 37.8701 },
  { longitude: -122.2590, latitude: 37.8701 },
  { longitude: -122.2578, latitude: 37.8701 },
  { longitude: -122.2626, latitude: 37.8713 },
  { longitude: -122.2614, latitude: 37.8713 },
  { longitude: -122.2602, latitude: 37.8713 },
  { longitude: -122.2590, latitude: 37.8713 },
  { longitude: -122.2578, latitude: 37.8713 },
  { longitude: -122.2626, latitude: 37.8725 },
  { longitude: -122.2614, latitude: 37.8725 },
  { longitude: -122.2602, latitude: 37.8725 },
  { longitude: -122.2590, latitude: 37.8725 },
  { longitude: -122.2578, latitude: 37.8725 },
];

type FeatureModelConfig = {
  altitude: number;
  anchorToGround: boolean;
  floatAmplitude: number;
  floatSpeed: number;
  id: string;
  latitude: number;
  longitude: number;
  orbit?: {
    bankAngle: number;
    phase: number;
    pitchAngle: number;
    radiusEast: number;
    radiusNorth: number;
    speed: number;
  };
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  spinSpeed: number;
  targetSizeMeters: number;
  url: string;
};

const FEATURE_MODELS: FeatureModelConfig[] = [
  {
    id: "downtown-testcube",
    url: "/models/Testcube.gltf",
    longitude: DOWNTOWN_SF.longitude,
    latitude: DOWNTOWN_SF.latitude,
    altitude: 60,
    anchorToGround: false,
    targetSizeMeters: 90,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    floatAmplitude: 4.5,
    floatSpeed: 0.55,
    spinSpeed: 0.12,
  },
  {
    id: "alcatraz-blender-cube",
    url: "/models/blendertestcube.glb",
    longitude: ALCATRAZ_ISLAND.longitude,
    latitude: ALCATRAZ_ISLAND.latitude,
    altitude: 520,
    anchorToGround: false,
    targetSizeMeters: 1000,
    rotationX: 0,
    rotationY: 0.45,
    rotationZ: 0,
    floatAmplitude: 0,
    floatSpeed: 0,
    spinSpeed: 0,
  },
  {
    id: "sf-fighter-loop",
    url: "/models/Fighter.glb",
    longitude: DOWNTOWN_SF.longitude,
    latitude: DOWNTOWN_SF.latitude,
    altitude: 140,
    anchorToGround: false,
    targetSizeMeters: 55,
    rotationX: 0,
    rotationY: Math.PI / 2,
    rotationZ: 0,
    floatAmplitude: 0,
    floatSpeed: 0,
    spinSpeed: 0,
    orbit: {
      radiusEast: 520,
      radiusNorth: 340,
      speed: 0.18,
      phase: 0,
      bankAngle: 0.22,
      pitchAngle: -0.06,
    },
  },
  ...UC_BERKELEY_ROBOT_POSITIONS.map((position, index) => ({
    id: `uc-berkeley-robot-${index + 1}`,
    url: "/models/robot.glb",
    longitude: position.longitude,
    latitude: position.latitude,
    altitude: 0,
    anchorToGround: true,
    targetSizeMeters: 18,
    rotationX: 0,
    rotationY: (index % 8) * (Math.PI / 4),
    rotationZ: 0,
    floatAmplitude: 0,
    floatSpeed: 0,
    spinSpeed: 0,
  })),
];

type FeatureModelState = {
  baseEast: number;
  baseNorth: number;
  baseRotationX: number;
  baseRotationY: number;
  baseRotationZ: number;
  baseUp: number;
  config: FeatureModelConfig;
  group: THREE.Group;
  isLoaded: boolean;
  phase: number;
};

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
  private readonly gltfLoader = new GLTFLoader();

  private readonly featureModels = new globalThis.Map<string, FeatureModelState>();
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

    this.loadFeatureModels();
    this.syncObjects();
  }

  render(gl: WebGLRenderingContext | WebGL2RenderingContext, args: CustomRenderMethodInput) {
    if (!this.renderer) {
      return;
    }

    const elapsed = this.clock.getElapsedTime();
    const sceneScale = this.anchorMercator.meterInMercatorCoordinateUnits();

    for (const featureModel of this.featureModels.values()) {
      const orbit = featureModel.config.orbit;
      const floatOffset =
        Math.sin(elapsed * featureModel.config.floatSpeed + featureModel.phase) *
        featureModel.config.floatAmplitude;

      let east = featureModel.baseEast;
      let north = featureModel.baseNorth;
      let rotationX = featureModel.baseRotationX;
      let rotationY = featureModel.baseRotationY + elapsed * featureModel.config.spinSpeed;
      let rotationZ = featureModel.baseRotationZ;

      if (orbit) {
        const orbitAngle = elapsed * orbit.speed + orbit.phase;

        east += Math.cos(orbitAngle) * orbit.radiusEast;
        north += Math.sin(orbitAngle) * orbit.radiusNorth;
        rotationX += orbit.pitchAngle;
        rotationY = featureModel.baseRotationY - orbitAngle + Math.PI / 2;
        rotationZ += orbit.bankAngle;
      }

      featureModel.group.position.set(east, featureModel.baseUp + floatOffset, north);
      featureModel.group.rotation.set(rotationX, rotationY, rotationZ);
    }

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
    for (const featureModel of this.featureModels.values()) {
      this.scene.remove(featureModel.group);
      this.disposeObject3D(featureModel.group);
    }
    this.featureModels.clear();

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

  private loadFeatureModels() {
    for (const config of FEATURE_MODELS) {
      this.loadFeatureModel(config);
    }
  }

  private loadFeatureModel(config: FeatureModelConfig) {
    if (this.featureModels.has(config.id)) {
      return;
    }

    const featureGroup = new THREE.Group();
    const position = lngLatToScenePosition(
      this.anchorMercator,
      config.longitude,
      config.latitude,
      config.altitude,
    );

    featureGroup.position.set(position.east, position.up, position.north);
    featureGroup.rotation.set(config.rotationX, config.rotationY, config.rotationZ);

    this.scene.add(featureGroup);

    const featureModel: FeatureModelState = {
      baseEast: position.east,
      baseNorth: position.north,
      baseRotationX: config.rotationX,
      config,
      baseRotationY: config.rotationY,
      baseRotationZ: config.rotationZ,
      baseUp: config.altitude,
      group: featureGroup,
      isLoaded: false,
      phase: Math.random() * Math.PI * 2,
    };

    this.featureModels.set(config.id, featureModel);

    this.gltfLoader.load(
      config.url,
      (gltf) => {
        const modelRoot = gltf.scene;

        this.prepareFeatureModel(modelRoot, config.targetSizeMeters, config.anchorToGround);
        featureGroup.add(modelRoot);
        featureModel.isLoaded = true;
        this.map?.triggerRepaint();
      },
      undefined,
      (error) => {
        console.error(`Failed to load feature model ${config.id}`, error);
      },
    );
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

  private prepareFeatureModel(
    modelRoot: THREE.Object3D,
    targetSizeMeters: number,
    anchorToGround: boolean,
  ) {
    const bounds = new THREE.Box3().setFromObject(modelRoot);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    modelRoot.position.x -= center.x;
    modelRoot.position.z -= center.z;
    modelRoot.position.y -= anchorToGround ? bounds.min.y : center.y;

    if (maxDimension > 0) {
      const scaleFactor = targetSizeMeters / maxDimension;
      modelRoot.scale.setScalar(scaleFactor);
    }

    modelRoot.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = false;
    });
  }

  private disposeObject3D(object: THREE.Object3D) {
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      child.geometry.dispose();

      if (Array.isArray(child.material)) {
        for (const material of child.material) {
          material.dispose();
        }
        return;
      }

      child.material.dispose();
    });
  }
}
