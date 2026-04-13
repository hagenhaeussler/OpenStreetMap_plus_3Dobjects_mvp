import { useEffect } from "react";
import { ControlsPanel } from "./components/ControlsPanel";
import { MapView } from "./components/MapView";
import { useObjectsStore } from "./state/objectsStore";

export function App() {
  const {
    objects,
    selectedId,
    addMode,
    selectedType,
    setAddMode,
    setSelectedType,
    selectObject,
    deleteSelected,
    resetDemoData,
  } = useObjectsStore();

  const selectedObject = objects.find((object) => object.id === selectedId) ?? null;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedId) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName ?? "";
      const isEditable =
        target?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        tagName === "BUTTON";

      if (isEditable) {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteSelected, selectedId]);

  return (
    <div className="app-shell">
      <MapView
        addMode={addMode}
        objects={objects}
        selectedId={selectedId}
        selectedType={selectedType}
        onSelectObject={selectObject}
      />
      <ControlsPanel
        addMode={addMode}
        objectCount={objects.length}
        selectedObject={selectedObject}
        selectedType={selectedType}
        onDeleteSelected={deleteSelected}
        onResetDemoData={resetDemoData}
        onSelectType={setSelectedType}
        onToggleAddMode={setAddMode}
      />
    </div>
  );
}

