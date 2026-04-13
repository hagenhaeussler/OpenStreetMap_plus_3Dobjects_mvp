# 3D City Map PoC

Minimal proof-of-concept web app that combines MapLibre GL JS and a single Three.js custom layer to place interactive 3D objects over a real 3D city map of downtown San Francisco.

## Install

```bash
npm install
npm run dev
```

Open the local Vite URL in a browser.

## Architecture Summary

- `MapLibre GL JS` owns the base map, camera, navigation, and 3D building extrusion.
- `OpenFreeMap` provides the token-free OpenStreetMap-based style.
- `Three.js` is mounted as exactly one custom MapLibre layer and renders all seeded and user-created 3D meshes.
- `React context + reducer` stores app state for objects, selection, add mode, and persistence.
- `localStorage` stores the current object layout. If empty, the app loads seeded demo objects.

## Interaction Model

- Add:
  Choose a primitive type, toggle `Add mode`, then click the map to place an object at that longitude and latitude.
- Select:
  With add mode off, click near an object. Selection uses projected screen-space distance rather than full raycasting to keep the PoC simple and robust.
- Delete:
  Use the panel button or press `Delete` / `Backspace` to remove the selected object.
- Reset:
  Restore the original seeded downtown demo layout from the panel.

## Project Structure

- `src/components`
  React UI and map host components.
- `src/map`
  Map setup, building extrusion, coordinate helpers, screen-space picking, and the Three.js custom layer.
- `src/state`
  Local application store and persistence.
- `src/types`
  Shared `MapObject` types and object defaults.
- `src/data`
  Seeded downtown San Francisco objects.
- `src/styles`
  App styling.

## Tradeoffs

- Object selection is based on 2D projected proximity instead of GPU picking. That keeps the implementation small and matches the requested simplification.
- The Three.js scene uses a fixed local origin around downtown San Francisco. That is accurate for the visible city area and normal interaction, but it is not meant to be a global-scale geospatial engine.
- Objects float above sea level using their stored altitude and do not snap to roof heights or terrain.

## LLM Reproduction Prompt

The exact original prompt was not stored in this repository. The prompt below is a faithful reconstruction of the project requirements so the app can be reproduced with an LLM in the future.

```text
Build a minimal proof-of-concept web app with React, TypeScript, and Vite that combines MapLibre GL JS with a single Three.js custom layer.

Project goal:
- Show a real 3D city map of downtown San Francisco.
- Render interactive 3D objects above the map.
- Let the user add, select, delete, and reset those objects.
- Persist objects in localStorage.

Technical requirements:
- Use MapLibre GL JS for the base map, camera controls, and map rendering.
- Use the OpenFreeMap Liberty style so the app works without a Mapbox token.
- Add a 3D building extrusion layer for buildings in the city.
- Use exactly one Three.js custom MapLibre layer to render all user objects.
- Use React context plus reducer state management for the object store.
- Use TypeScript across the project.
- Keep the implementation as a small MVP, not a full geospatial engine.

Object requirements:
- Support these primitive types: sphere, box, cone, cylinder, torus knot.
- Seed the app with demo objects around downtown San Francisco on first load.
- Store each object with id, type, longitude, latitude, altitude, scale, color, and rotation.
- When the user adds an object, place it at the clicked longitude and latitude with sensible defaults.

Interaction requirements:
- Include a floating control panel with:
  - object type selector
  - add mode toggle
  - delete selected button
  - reset demo data button
  - object count and current mode
  - current selection details
- In add mode, clicking the map should place a new object.
- Outside add mode, clicking near an object should select it.
- Use projected screen-space distance for selection instead of GPU picking or full raycasting.
- Support deleting the selected object with the panel button and also the Delete or Backspace key.

Three.js requirements:
- Render all objects in one scene attached to the custom map layer.
- Convert lng/lat/alt positions into a local scene coordinate system anchored near the map center.
- Give objects polished but simple visuals, with lighting and subtle animation.
- Make the selected object visually distinct.

Project structure requirements:
- Keep React UI components under src/components.
- Keep map utilities and custom layers under src/map.
- Keep seeded data under src/data.
- Keep state management under src/state.
- Keep shared types under src/types.
- Keep styles in src/styles/app.css.

Acceptance criteria:
- Running npm install and npm run dev should start the app locally.
- The map should open over downtown San Francisco with pitch and bearing already set for a 3D view.
- Seeded objects should appear immediately.
- Added objects should persist after refresh.
- Reset should restore the original seeded demo layout.
- The implementation should stay concise, readable, and appropriate for an MVP.
```

