# Webtoon Studio

Webtoon Studio is a browser-first, dark-mode editor for assembling long vertical comics. It is an actual canvas editor rather than a UI mock: artwork can be imported, transformed and layered; panels, Thai text, bubbles and procedural focus lines are editable objects; projects recover from IndexedDB; and episodes export as safely sliced ZIP archives.

## Features

- 800 × 6,000 px default continuous workspace (dimensions/background editable), zoom, Fit, wheel zoom and Space-drag pan.
- Multi-file PNG/JPEG/WebP import and drag/drop. Move, resize, rotate, flip, opacity, duplicate, delete, layer ordering, locking and non-destructive crop reset.
- Rectangle/rounded panels and automatic 1–4 panel templates.
- Speech, thought and narration bubbles grouped with editable Thai-capable text.
- Free text with multiline wrapping, typography controls and system Thai fallback (`Tahoma`, `Noto Sans Thai`, sans-serif).
- Editable focus-line effect and overlay shapes.
- Click-through layer list with visibility, lock and front/back controls; contextual properties with numeric transforms.
- 50-step JSON history, keyboard movement, undo/redo and duplicate/delete shortcuts.
- IndexedDB recovery/autosave plus portable `.webtoon-project` files containing image data.
- memory-safe segmented PNG/JPG output, configurable scale/quality/height, sequential filenames and ZIP download.

## Technology and architecture

React 18, strict TypeScript, Vite, Zustand, Fabric.js, IndexedDB (`idb`) and JSZip. Fabric was selected over Konva because its object serialization, interactive controls, grouped objects, text editing and image crop properties reduce custom editor code. Export renders slices instead of creating one browser-hostile multi-thousand-pixel bitmap. Editor concerns are separated into `store.ts`, typed models, persistence, history, serialization, ordering and export planning utilities.

## Install and run

```bash
npm install
npm run dev
```

Open the URL Vite prints (normally `http://localhost:5173`). Production:

```bash
npm run build
npm run preview -- --host 0.0.0.0
```

## Basic use

1. Drop artwork on the white episode or choose **Image**.
2. Use Fabric's corner/rotation handles. Choose Panel, Bubble, Text, Effects or Templates on the left.
3. Select a layer to edit exact values in Properties. Canvas dimensions are available when nothing is selected.
4. Save downloads a self-contained project; recovery also runs every 15 seconds after changes.
5. Export chooses PNG/JPG, slice height and scale, then downloads numbered parts in a ZIP.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + S` | Save project |
| `Ctrl/Cmd + Z` / `Ctrl/Cmd + Shift + Z` | Undo / redo |
| `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + D` | Duplicate |
| `Delete` / `Backspace` | Delete |
| Arrows / `Shift` + arrows | Nudge 1 / 10 px |
| `Space` + drag | Pan |
| `Ctrl/Cmd` + wheel | Zoom |

Shortcuts are ignored while an input or textarea is focused.

## Structure

- `src/App.tsx` – editor shell, Fabric canvas, tools, panels, commands and export UI
- `src/store.ts` – transient UI/editor state
- `src/types.ts` – project/layer/tool contracts
- `src/utils/` – history, serialization, IndexedDB, ordering and export slicing
- `src/utils/core.test.ts` – core unit tests

## Limitations

This first release uses a continuous Fabric surface rather than visual section virtualization; exported rendering is segmented, but editing extremely dense episodes can still depend on device GPU memory. Panel-image masking, arbitrary crop handles, draggable bubble-tail endpoints, multi-selection grouping/ungrouping, custom font upload, sharp shout bubbles and fully parameterized speed-line controls are recommended follow-ups. Bubble text can be edited after ungrouping through Fabric internals, while this MVP exposes direct text editing for free text. Touch uses browser pointer events but does not yet offer a custom two-finger pinch implementation.

## Roadmap

1. Section virtualization and original/preview image asset tiers.
2. First-class panel clipping with independent image transform and crop overlay.
3. Rich bubble editor (tail nodes, overflow detector, shout geometry).
4. Group/ungroup UI, multi-layer drag sorting, clipboard and custom fonts.
5. Playwright flows, mobile gesture tuning and collaborative cloud storage.

## Static deployment

Run `npm run build` and publish `dist/` to Netlify, Cloudflare Pages, GitHub Pages or any static host. No backend or environment variables are required. Configure unknown routes to return `index.html` if a host requires an SPA fallback.
