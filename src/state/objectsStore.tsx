import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from "react";
import { seedObjects } from "../data/seedObjects";
import { isMapObject, type MapObject, type ObjectType } from "../types/mapObject";

const STORAGE_KEY = "city-objects-poc:v1";

type ObjectsState = {
  addMode: boolean;
  objects: MapObject[];
  selectedId: string | null;
  selectedType: ObjectType;
};

type ObjectsContextValue = ObjectsState & {
  addObject: (object: MapObject) => void;
  deleteSelected: () => void;
  resetDemoData: () => void;
  selectObject: (id: string | null) => void;
  setAddMode: (value: boolean) => void;
  setSelectedType: (type: ObjectType) => void;
};

type Action =
  | { type: "addObject"; payload: MapObject }
  | { type: "deleteSelected" }
  | { type: "resetDemoData" }
  | { type: "selectObject"; payload: string | null }
  | { type: "setAddMode"; payload: boolean }
  | { type: "setSelectedType"; payload: ObjectType };

const ObjectsContext = createContext<ObjectsContextValue | null>(null);

function readInitialObjects() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return seedObjects;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const objects = parsed.filter(isMapObject);
      if (objects.length > 0) {
        return objects;
      }
    }
  } catch {
    return seedObjects;
  }

  return seedObjects;
}

function reducer(state: ObjectsState, action: Action): ObjectsState {
  switch (action.type) {
    case "addObject":
      return {
        ...state,
        objects: [...state.objects, action.payload],
        selectedId: action.payload.id,
      };
    case "deleteSelected":
      if (!state.selectedId) {
        return state;
      }

      return {
        ...state,
        objects: state.objects.filter((object) => object.id !== state.selectedId),
        selectedId: null,
      };
    case "resetDemoData":
      return {
        ...state,
        addMode: false,
        objects: seedObjects,
        selectedId: null,
      };
    case "selectObject":
      return {
        ...state,
        selectedId: action.payload,
      };
    case "setAddMode":
      return {
        ...state,
        addMode: action.payload,
      };
    case "setSelectedType":
      return {
        ...state,
        selectedType: action.payload,
      };
    default:
      return state;
  }
}

export function ObjectsProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    addMode: false,
    objects: readInitialObjects(),
    selectedId: null,
    selectedType: "sphere" as const,
  }));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.objects));
  }, [state.objects]);

  const addObject = useCallback((object: MapObject) => {
    dispatch({ type: "addObject", payload: object });
  }, []);

  const deleteSelected = useCallback(() => {
    dispatch({ type: "deleteSelected" });
  }, []);

  const resetDemoData = useCallback(() => {
    dispatch({ type: "resetDemoData" });
  }, []);

  const selectObject = useCallback((id: string | null) => {
    dispatch({ type: "selectObject", payload: id });
  }, []);

  const setAddMode = useCallback((value: boolean) => {
    dispatch({ type: "setAddMode", payload: value });
  }, []);

  const setSelectedType = useCallback((type: ObjectType) => {
    dispatch({ type: "setSelectedType", payload: type });
  }, []);

  const value = useMemo<ObjectsContextValue>(
    () => ({
      ...state,
      addObject,
      deleteSelected,
      resetDemoData,
      selectObject,
      setAddMode,
      setSelectedType,
    }),
    [addObject, deleteSelected, resetDemoData, selectObject, setAddMode, setSelectedType, state],
  );

  return <ObjectsContext.Provider value={value}>{children}</ObjectsContext.Provider>;
}

export function useObjectsStore() {
  const context = useContext(ObjectsContext);

  if (!context) {
    throw new Error("useObjectsStore must be used within an ObjectsProvider");
  }

  return context;
}
