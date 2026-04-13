import { OBJECT_LABELS, OBJECT_TYPES, type MapObject, type ObjectType } from "../types/mapObject";

type ControlsPanelProps = {
  addMode: boolean;
  objectCount: number;
  selectedObject: MapObject | null;
  selectedType: ObjectType;
  onDeleteSelected: () => void;
  onResetDemoData: () => void;
  onSelectType: (type: ObjectType) => void;
  onToggleAddMode: (value: boolean) => void;
};

export function ControlsPanel({
  addMode,
  objectCount,
  selectedObject,
  selectedType,
  onDeleteSelected,
  onResetDemoData,
  onSelectType,
  onToggleAddMode,
}: ControlsPanelProps) {
  return (
    <aside className="floating-panel">
      <div className="panel-eyebrow">3D City Objects</div>
      <h1>San Francisco Demo</h1>
      <p className="panel-copy">
        Navigate the city, place new primitives, and delete existing ones. Objects persist in your browser.
      </p>

      <label className="panel-field">
        <span>Object type</span>
        <select
          value={selectedType}
          onChange={(event) => onSelectType(event.target.value as ObjectType)}
        >
          {OBJECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {OBJECT_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <div className="panel-actions">
        <button
          className={addMode ? "is-active" : ""}
          type="button"
          onClick={() => onToggleAddMode(!addMode)}
        >
          {addMode ? "Exit add mode" : "Enter add mode"}
        </button>
        <button
          type="button"
          disabled={!selectedObject}
          onClick={onDeleteSelected}
        >
          Delete selected
        </button>
        <button type="button" onClick={onResetDemoData}>
          Reset demo data
        </button>
      </div>

      <div className="panel-status">
        <div>
          <span className="status-label">Objects</span>
          <strong>{objectCount}</strong>
        </div>
        <div>
          <span className="status-label">Mode</span>
          <strong>{addMode ? "Adding" : "Selecting"}</strong>
        </div>
      </div>

      <div className="selection-card">
        <span className="status-label">Selection</span>
        {selectedObject ? (
          <>
            <strong>{OBJECT_LABELS[selectedObject.type]}</strong>
            <span>
              {selectedObject.longitude.toFixed(4)}, {selectedObject.latitude.toFixed(4)}
            </span>
          </>
        ) : (
          <span>No object selected</span>
        )}
      </div>
    </aside>
  );
}

