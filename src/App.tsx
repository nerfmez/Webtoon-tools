import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Canvas, Circle, Ellipse, FabricImage, FabricObject, Gradient, Group, Line,
  Polygon, Rect, Textbox, Triangle,
} from 'fabric';
import JSZip from 'jszip';
import {
  ChevronsDown, ChevronsUp, Copy, Download, Eye, EyeOff, FilePlus, FolderOpen,
  Hand, ImagePlus, Layers as LayersIcon, Lock, Menu, MousePointer2, PanelTop,
  Redo2, Save, Shapes, Trash2, Type, Undo2, Unlock, X, ZoomIn, ZoomOut,
} from 'lucide-react';
import { useEditor } from './store';
import type {
  EffectConfig, FocusEffectConfig, GradientEffectConfig, LayerInfo, LayerKind,
  PlacementKind, ProjectData, SpeedEffectConfig, Tool, VignetteEffectConfig,
} from './types';
import { planSlices } from './utils/export';
import { History } from './utils/history';
import { deserializeProject, serializeProject } from './utils/serialization';
import { loadRecovery, saveRecovery } from './utils/storage';

interface ObjectData {
  id: string;
  kind: LayerKind;
  name: string;
  radius?: number;
  fillOpacity?: number;
  borderEnabled?: boolean;
  borderStyle?: 'solid' | 'dashed';
  lockAspect?: boolean;
  effect?: EffectConfig;
}
type FObj = FabricObject & { data?: ObjectData };
type DocumentSettings = { name: string; width: number; height: number; bg: string };

FabricObject.customProperties = ['data', 'selectable'];
const uid = () => crypto.randomUUID();
const toolItems: Array<[Tool, string, typeof MousePointer2]> = [
  ['select', 'Select', MousePointer2], ['hand', 'Hand', Hand], ['image', 'Image', ImagePlus],
  ['panel', 'Panel', PanelTop], ['bubble', 'Bubble', Shapes], ['text', 'Text', Type],
  ['effects', 'Effects', ZoomIn], ['templates', 'Templates', LayersIcon],
];
const placementMessage = (kind: PlacementKind) =>
  kind.startsWith('panel') ? 'Tap canvas to place panel' :
  kind.startsWith('bubble') ? 'Tap canvas to place bubble' :
  kind.startsWith('effect') ? 'Tap canvas to place effect' : 'Tap canvas to place text';
const download = (blob: Blob, name: string) => {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
};

function focusConfig(): FocusEffectConfig {
  return { type: 'focus', centerX: 300, centerY: 260, lineCount: 28, innerRadius: 65, outerRadius: 280, lineLength: 215, strokeWidth: 3, color: '#111111', opacity: .72, angleOffset: 0, randomLength: 18, randomAngle: 2 };
}
function speedConfig(type: 'speed' | 'motion' = 'speed'): SpeedEffectConfig {
  return { type, angle: 0, lineCount: 22, minLength: 90, maxLength: 260, strokeWidth: 3, spacing: 18, color: '#111111', opacity: .72, randomness: 20, spread: 300 };
}
function gradientConfig(): GradientEffectConfig {
  return { type: 'gradient', startColor: '#000000', endColor: '#7c3aed', direction: 90, opacity: .45, blendMode: 'source-over', width: 600, height: 400 };
}
function vignetteConfig(): VignetteEffectConfig {
  return { type: 'vignette', intensity: .7, radius: 260, softness: .55, color: '#000000', opacity: .65 };
}
function buildEffect(config: EffectConfig): FabricObject[] {
  if (config.type === 'focus') {
    return Array.from({ length: config.lineCount }, (_, index) => {
      const base = (index / config.lineCount) * Math.PI * 2 + config.angleOffset * Math.PI / 180;
      const jitter = Math.sin(index * 12.9898) * config.randomAngle * Math.PI / 180;
      const angle = base + jitter;
      const extra = Math.abs(Math.sin(index * 78.233)) * config.randomLength;
      const start = config.innerRadius;
      const end = Math.min(config.outerRadius, start + config.lineLength - extra);
      return new Line([
        config.centerX + Math.cos(angle) * start, config.centerY + Math.sin(angle) * start,
        config.centerX + Math.cos(angle) * end, config.centerY + Math.sin(angle) * end,
      ], { stroke: config.color, strokeWidth: config.strokeWidth, opacity: config.opacity, selectable: false, evented: false });
    });
  }
  if (config.type === 'speed' || config.type === 'motion') {
    const radians = config.angle * Math.PI / 180;
    return Array.from({ length: config.lineCount }, (_, index) => {
      const offset = (index - (config.lineCount - 1) / 2) * config.spacing;
      const random = Math.abs(Math.sin(index * 91.17));
      const length = config.minLength + (config.maxLength - config.minLength) * random;
      const along = (random - .5) * config.randomness;
      const x = 300 + -Math.sin(radians) * offset + Math.cos(radians) * along;
      const y = 240 + Math.cos(radians) * offset + Math.sin(radians) * along;
      return new Line([x, y, x + Math.cos(radians) * length, y + Math.sin(radians) * length], {
        stroke: config.color, strokeWidth: config.strokeWidth, opacity: config.opacity,
        selectable: false, evented: false,
      });
    });
  }
  if (config.type === 'gradient') {
    const radians = config.direction * Math.PI / 180;
    const x2 = .5 + Math.cos(radians) * .5;
    const y2 = .5 + Math.sin(radians) * .5;
    return [new Rect({
      width: config.width, height: config.height, opacity: config.opacity,
      globalCompositeOperation: config.blendMode,
      fill: new Gradient({ type: 'linear', gradientUnits: 'percentage', coords: { x1: .5 - (x2 - .5), y1: .5 - (y2 - .5), x2, y2 }, colorStops: [{ offset: 0, color: config.startColor }, { offset: 1, color: config.endColor }] }),
      selectable: false, evented: false,
    })];
  }
  const vignette = config as VignetteEffectConfig;
  return Array.from({ length: 10 }, (_, index) => {
    const ratio = 1 - index / 10;
    return new Ellipse({ left: index * 12, top: index * 9, rx: vignette.radius * ratio, ry: vignette.radius * .7 * ratio, fill: 'transparent', stroke: vignette.color, strokeWidth: 28 * vignette.softness, opacity: vignette.opacity * vignette.intensity * (1 - ratio + .1), selectable: false, evented: false });
  });
}

export function App() {
  const canvasElement = useRef<HTMLCanvasElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const history = useRef(new History<string>(''));
  const placementRef = useRef<PlacementKind | null>(null);
  const keepAddingRef = useRef(false);
  const [doc, setDoc] = useState<DocumentSettings>({ name: 'episode-01', width: 800, height: 6000, bg: '#ffffff' });
  const [selection, setSelection] = useState<FObj | null>(null);
  const [tab, setTab] = useState<'layers' | 'properties'>('layers');
  const [placement, setPlacement] = useState<PlacementKind | null>(null);
  const [keepAdding, setKeepAdding] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [split, setSplit] = useState(2000);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [quality, setQuality] = useState(.92);
  const [scale, setScale] = useState(1);
  const store = useEditor();

  useEffect(() => { placementRef.current = placement; }, [placement]);
  useEffect(() => { keepAddingRef.current = keepAdding; }, [keepAdding]);
  const layerList = useCallback((canvas: Canvas) => canvas.getObjects().map((item, index) => {
    const object = item as FObj;
    return { id: object.data?.id ?? String(index), name: object.data?.name ?? 'Layer', kind: object.data?.kind ?? 'effect', visible: item.visible !== false, locked: !item.selectable } as LayerInfo;
  }).reverse(), []);
  const sync = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    store.setLayers(layerList(canvas));
    store.setDirty(true);
    history.current.push(JSON.stringify(canvas.toJSON()));
  }, [layerList, store]);
  const loadJSON = useCallback(async (json: Record<string, unknown>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    await canvas.loadFromJSON(json);
    canvas.requestRenderAll();
    store.setLayers(layerList(canvas));
  }, [layerList, store]);
  const cancelPlacement = useCallback(() => {
    setPlacement(null);
    store.setTool('select');
  }, [store]);
  const add = useCallback((object: FObj, kind: LayerKind, name: string, x = 100, y = 100) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    object.data = { ...object.data, id: uid(), kind, name };
    object.set({ left: x, top: y });
    canvas.add(object);
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    sync();
  }, [sync]);
  const createAt = useCallback((kind: PlacementKind, x: number, y: number) => {
    if (kind.startsWith('panel')) {
      const radius = kind === 'panel-rounded' ? 30 : 0;
      const border = kind !== 'panel-borderless';
      const filled = kind === 'panel-filled';
      const panel = new Rect({ width: 520, height: 320, rx: radius, ry: radius, fill: filled ? '#ffffff' : 'rgba(255,255,255,0.01)', stroke: border ? '#111111' : undefined, strokeWidth: border ? 6 : 0 }) as FObj;
      panel.data = { id: '', kind: 'panel', name: radius ? 'Rounded Panel' : 'Panel', radius, fillOpacity: filled ? 1 : 0, borderEnabled: border, borderStyle: 'solid', lockAspect: false };
      add(panel, 'panel', panel.data.name, x, y);
    } else if (kind.startsWith('bubble')) {
      let shape: FabricObject;
      if (kind === 'bubble-narration') shape = new Rect({ width: 400, height: 180, fill: '#fff7d6', stroke: '#111111', strokeWidth: 4 });
      else if (kind === 'bubble-rounded') shape = new Rect({ width: 400, height: 210, rx: 40, ry: 40, fill: '#ffffff', stroke: '#111111', strokeWidth: 4 });
      else if (kind === 'bubble-shout') shape = new Polygon(Array.from({ length: 20 }, (_, i) => { const a = i * Math.PI * 2 / 20; const r = i % 2 ? 180 : 215; return { x: 215 + Math.cos(a) * r, y: 180 + Math.sin(a) * r * .6 }; }), { fill: '#ffffff', stroke: '#111111', strokeWidth: 4 });
      else shape = new Ellipse({ rx: 210, ry: 115, fill: '#ffffff', stroke: '#111111', strokeWidth: 4 });
      const parts: FabricObject[] = [shape];
      if (kind === 'bubble-thought') parts.push(new Circle({ left: 340, top: 195, radius: 18, fill: '#ffffff', stroke: '#111111', strokeWidth: 3 }));
      else if (kind !== 'bubble-narration') parts.push(new Triangle({ left: 290, top: 185, width: 50, height: 80, angle: 18, fill: '#ffffff', stroke: '#111111', strokeWidth: 3 }));
      parts.push(new Textbox('บทสนทนา', { left: 45, top: 65, width: 320, fontSize: 32, fontFamily: 'Tahoma, Noto Sans Thai, sans-serif', textAlign: 'center', fill: '#111111' }));
      add(new Group(parts) as FObj, 'bubble', 'Bubble', x, y);
    } else if (kind.startsWith('text')) {
      const text = kind === 'text-sfx' ? 'เอฟเฟกต์เสียง!' : kind === 'text-narration' ? 'กล่องคำบรรยาย' : 'พิมพ์ข้อความภาษาไทย';
      add(new Textbox(text, { width: 400, fontSize: kind === 'text-sfx' ? 52 : 34, fontWeight: kind === 'text-sfx' ? 'bold' : 'normal', fontFamily: 'Tahoma, Noto Sans Thai, sans-serif', textAlign: 'center', fill: '#111111' }) as FObj, 'text', 'Text', x, y);
    } else {
      const config: EffectConfig = kind === 'effect-focus' || kind === 'effect-flash' ? focusConfig() : kind === 'effect-speed' || kind === 'effect-motion' ? speedConfig(kind === 'effect-motion' ? 'motion' : 'speed') : kind === 'effect-vignette' ? vignetteConfig() : gradientConfig();
      if (kind === 'effect-solid' && config.type === 'gradient') config.endColor = config.startColor;
      const group = new Group(buildEffect(config)) as FObj;
      group.data = { id: '', kind: 'effect', name: `${config.type[0].toUpperCase()}${config.type.slice(1)} Effect`, effect: config };
      add(group, 'effect', group.data.name, x, y);
    }
  }, [add]);

  useEffect(() => {
    if (!canvasElement.current) return;
    const canvas = new Canvas(canvasElement.current, { width: doc.width * .25, height: doc.height * .25, backgroundColor: doc.bg, preserveObjectStacking: true });
    canvas.setZoom(.25);
    canvasRef.current = canvas;
    history.current = new History(JSON.stringify(canvas.toJSON()));
    const select = () => {
      const objects = canvas.getActiveObjects() as FObj[];
      store.setSelected(objects.map(object => object.data?.id ?? ''));
      setSelection(objects[0] ?? null);
      if (objects.length) setTab('properties');
    };
    canvas.on('selection:created', select);
    canvas.on('selection:updated', select);
    canvas.on('selection:cleared', () => { store.setSelected([]); setSelection(null); });
    canvas.on('object:modified', sync);
    canvas.on('object:scaling', event => {
      const object = event.target as FObj;
      if (object.data?.lockAspect) object.set({ scaleY: object.scaleX });
    });
    canvas.on('mouse:down', event => {
      const pending = placementRef.current;
      if (!pending) return;
      const point = canvas.getScenePoint(event.e);
      createAt(pending, Math.max(0, point.x - 80), Math.max(0, point.y - 60));
      if (!keepAddingRef.current) cancelPlacement();
    });
    void loadRecovery().then(project => {
      if (project && confirm('พบงานที่บันทึกอัตโนมัติ ต้องการกู้คืนหรือไม่?')) {
        setDoc({ name: project.name, width: project.width, height: project.height, bg: project.background });
        void loadJSON(project.canvas);
      }
    });
    return () => { void canvas.dispose(); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.selection = store.tool === 'select';
    canvas.skipTargetFind = store.tool === 'hand' || placement !== null;
    canvas.getObjects().forEach(object => { object.evented = store.tool === 'select'; });
    const upper = canvas.upperCanvasEl;
    upper.style.touchAction = store.tool === 'hand' || (store.tool === 'select' && !selection) ? 'pan-x pan-y' : 'none';
    upper.style.pointerEvents = store.tool === 'hand' ? 'none' : 'auto';
    canvas.requestRenderAll();
  }, [placement, selection, store.tool, store.layers.length]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.backgroundColor = doc.bg;
    canvas.setDimensions({ width: doc.width * store.zoom, height: doc.height * store.zoom });
    canvas.setZoom(store.zoom);
    canvas.requestRenderAll();
  }, [doc, store.zoom]);

  const applyZoom = (next: number) => store.setZoom(Math.max(.05, Math.min(2, next)));
  const chooseTool = (tool: Tool) => {
    setPlacement(null);
    store.setTool(tool);
    if (tool === 'image') imageInput.current?.click();
    if (!['select', 'hand', 'image'].includes(tool)) setOptionsOpen(true);
  };
  const beginPlacement = (kind: PlacementKind) => { setPlacement(kind); store.setTool(kind.split('-')[0] === 'effect' ? 'effects' : kind.split('-')[0] as Tool); };
  const importImages = async (files: FileList | File[]) => {
    store.setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) continue;
        const source = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
        const image = await FabricImage.fromURL(source);
        const imageScale = Math.min(1, 650 / (image.width || 650));
        image.set({ scaleX: imageScale, scaleY: imageScale });
        add(image as FObj, 'image', file.name, 75, 100);
      }
    } finally { store.setBusy(false); }
  };
  const remove = () => { const canvas = canvasRef.current; if (!canvas) return; canvas.getActiveObjects().forEach(object => canvas.remove(object)); canvas.discardActiveObject(); sync(); canvas.requestRenderAll(); };
  const duplicate = () => { const canvas = canvasRef.current; if (!canvas) return; canvas.getActiveObjects().forEach(async object => { const clone = await object.clone(); clone.set({ left: object.left + 24, top: object.top + 24 }); add(clone as FObj, (object as FObj).data?.kind ?? 'group', `${(object as FObj).data?.name ?? 'Layer'} copy`, clone.left, clone.top); }); };
  const save = async (saveFile = false) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const project: ProjectData = { version: 1, name: doc.name, width: doc.width, height: doc.height, background: doc.bg, canvas: canvas.toJSON() as Record<string, unknown>, savedAt: new Date().toISOString() };
    await saveRecovery(project); store.setAutosaved(new Date().toLocaleTimeString('th-TH')); store.setDirty(false);
    if (saveFile) download(new Blob([serializeProject(project)], { type: 'application/json' }), `${doc.name}.webtoon-project`);
  };
  const undo = async (redo = false) => { const raw = redo ? history.current.redo() : history.current.undo(); if (raw) await loadJSON(JSON.parse(raw) as Record<string, unknown>); };
  const updateObject = (key: string, value: string | number | boolean) => {
    if (!selection) return;
    selection.set(key, value); selection.setCoords(); canvasRef.current?.requestRenderAll(); sync(); setSelection(selection);
  };
  const updateData = (patch: Partial<ObjectData>) => {
    if (!selection?.data) return;
    selection.data = { ...selection.data, ...patch };
    sync(); setSelection(selection);
  };
  const updatePanel = (patch: Partial<ObjectData>) => {
    if (!selection || selection.data?.kind !== 'panel') return;
    updateData(patch);
    if (patch.radius !== undefined) selection.set({ rx: patch.radius, ry: patch.radius });
    if (patch.borderEnabled !== undefined) selection.set({ strokeWidth: patch.borderEnabled ? Math.max(selection.strokeWidth, 1) : 0 });
    if (patch.borderStyle !== undefined) selection.set({ strokeDashArray: patch.borderStyle === 'dashed' ? [12, 8] : undefined });
    canvasRef.current?.requestRenderAll(); sync();
  };
  const updateEffect = (patch: Partial<EffectConfig>) => {
    if (!selection?.data?.effect || !(selection instanceof Group)) return;
    const config = { ...selection.data.effect, ...patch } as EffectConfig;
    selection.removeAll(); selection.add(...buildEffect(config)); selection.data = { ...selection.data, effect: config };
    selection.setCoords(); canvasRef.current?.requestRenderAll(); sync(); setSelection(selection);
  };

  useEffect(() => { const timer = setInterval(() => { if (store.dirty) void save(); }, 15000); return () => clearInterval(timer); }, [store.dirty, doc]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches('input,textarea,[contenteditable=true]')) return;
      if (event.key === 'Escape' && placementRef.current) { cancelPlacement(); return; }
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); void undo(event.shiftKey); }
      else if (modifier && event.key.toLowerCase() === 'y') { event.preventDefault(); void undo(true); }
      else if (modifier && event.key.toLowerCase() === 's') { event.preventDefault(); void save(true); }
      else if (modifier && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicate(); }
      else if (event.key === 'Delete' || event.key === 'Backspace') remove();
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, [selection, doc, store.dirty, cancelPlacement]);
  useEffect(() => {
    const element = workspace.current;
    if (!element) return;
    let previousDistance = 0;
    let previousCenter = { x: 0, y: 0 };
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      const [a, b] = Array.from(event.touches);
      previousDistance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      previousCenter = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
    };
    const move = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      const [a, b] = Array.from(event.touches);
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const center = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
      if (previousDistance > 0) applyZoom(store.zoom * distance / previousDistance);
      element.scrollLeft -= center.x - previousCenter.x;
      element.scrollTop -= center.y - previousCenter.y;
      previousDistance = distance;
      previousCenter = center;
    };
    const end = () => { previousDistance = 0; };
    element.addEventListener('touchstart', start, { passive: true });
    element.addEventListener('touchmove', move, { passive: false });
    element.addEventListener('touchend', end, { passive: true });
    return () => {
      element.removeEventListener('touchstart', start);
      element.removeEventListener('touchmove', move);
      element.removeEventListener('touchend', end);
    };
  }, [store.zoom]);
  const exportSlices = async () => {
    const canvas = canvasRef.current; if (!canvas || store.busy) return; store.setBusy(true);
    try {
      const slices = planSlices(doc.height, split, doc.name, format === 'jpeg' ? 'jpg' : 'png'); const zip = new JSZip();
      for (const slice of slices) { const url = canvas.toDataURL({ format, quality, multiplier: scale, left: 0, top: slice.y, width: doc.width, height: slice.height }); zip.file(slice.filename, url.split(',')[1], { base64: true }); }
      download(await zip.generateAsync({ type: 'blob' }), `${doc.name}.zip`); setExportOpen(false);
    } finally { store.setBusy(false); }
  };

  return <div className="app">
    <header><div className="brand"><span>W</span><b>Webtoon Studio</b></div><button className="panel-toggle options-toggle" onClick={() => setOptionsOpen(value => !value)} title="Toggle tool options"><Menu /></button><div className="toolbar"><button onClick={() => location.reload()}><FilePlus />New</button><button onClick={() => void save(true)}><Save />Save</button><button onClick={() => void undo()}><Undo2 /></button><button onClick={() => void undo(true)}><Redo2 /></button><i /><button onClick={() => applyZoom(store.zoom - .05)}><ZoomOut /></button><b>{Math.round(store.zoom * 100)}%</b><button onClick={() => applyZoom(store.zoom + .05)}><ZoomIn /></button></div><button className="panel-toggle inspector-toggle" onClick={() => setInspectorOpen(value => !value)} title="Toggle inspector"><LayersIcon /></button><button className="export" onClick={() => setExportOpen(true)}><Download />Export</button></header>
    <main className={`${optionsOpen ? 'options-open' : ''} ${inspectorOpen ? 'inspector-open' : ''}`}>
      <aside className="tools">{toolItems.map(([id, label, Icon]) => <button key={id} data-testid={`tool-${id}`} className={store.tool === id ? 'active' : ''} onClick={() => chooseTool(id)} title={label}><Icon /><small>{label}</small></button>)}<input ref={imageInput} hidden multiple type="file" accept="image/png,image/jpeg,image/webp" onChange={event => event.target.files && void importImages(event.target.files)} /></aside>
      <ToolOptions tool={store.tool} open={optionsOpen} close={() => setOptionsOpen(false)} begin={beginPlacement} keepAdding={keepAdding} setKeepAdding={setKeepAdding} />
      <section data-testid="workspace" className={`workspace mode-${store.tool}`} ref={workspace} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void importImages(event.dataTransfer.files); }}><div className="ruler">0    200    400    600    800 px</div><div className="canvas-shadow"><canvas ref={canvasElement} />{store.layers.length === 0 && !placement && <div className="empty"><ImagePlus /><h2>Start your episode</h2><p>Import artwork or choose a tool. Categories never insert objects until you choose an item.</p></div>}</div></section>
      <aside className={`inspector ${inspectorOpen ? 'open' : ''}`}><button className="drawer-close" onClick={() => setInspectorOpen(false)}><X /></button><nav><button className={tab === 'layers' ? 'active' : ''} onClick={() => setTab('layers')}>Layers <span>{store.layers.length}</span></button><button className={tab === 'properties' ? 'active' : ''} onClick={() => setTab('properties')}>Properties</button></nav>{tab === 'layers' ? <LayersPanel layers={store.layers} selected={store.selected} canvas={canvasRef.current} sync={sync} /> : <Properties object={selection} doc={doc} setDoc={setDoc} update={updateObject} updatePanel={updatePanel} updateEffect={updateEffect} remove={remove} duplicate={duplicate} />}</aside>
    </main>
    {placement && <div className="placement-status"><span>{placementMessage(placement)}</span><label><input type="checkbox" checked={keepAdding} onChange={event => setKeepAdding(event.target.checked)} /> Keep adding</label><button onClick={cancelPlacement}><X />Cancel</button></div>}
    <footer><span><i className="ready" /> Ready</span><span>{doc.width} × {doc.height} px</span><span>{store.layers.length} objects</span><span className="grow" /><span>{store.autosaved ? `Autosaved ${store.autosaved}` : 'Recovery autosave on'}</span></footer>
    <input ref={projectInput} hidden type="file" accept=".webtoon-project,application/json" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; const project = deserializeProject(await file.text()); setDoc({ name: project.name, width: project.width, height: project.height, bg: project.background }); await loadJSON(project.canvas); }} /><button className="load" onClick={() => projectInput.current?.click()} title="Load project"><FolderOpen /></button>
    {exportOpen && <ExportDialog doc={doc} setDoc={setDoc} format={format} setFormat={setFormat} quality={quality} setQuality={setQuality} scale={scale} setScale={setScale} split={split} setSplit={setSplit} close={() => setExportOpen(false)} run={() => void exportSlices()} />}
  </div>;
}

const optionGroups: Partial<Record<Tool, Array<[PlacementKind, string, string]>>> = {
  panel: [['panel-rectangle', 'Rectangle', 'Sharp corners'], ['panel-rounded', 'Rounded rectangle', '30 px radius'], ['panel-borderless', 'Borderless panel', 'No stroke'], ['panel-filled', 'Filled panel', 'Opaque white']],
  bubble: [['bubble-speech', 'Speech ellipse', 'Classic speech'], ['bubble-rounded', 'Rounded speech bubble', 'Soft rectangle'], ['bubble-thought', 'Thought bubble', 'Cloud tail'], ['bubble-shout', 'Shout bubble', 'Sharp emphasis'], ['bubble-narration', 'Narration box', 'Caption']],
  text: [['text-dialogue', 'Dialogue', 'Thai-ready body'], ['text-narration', 'Narration', 'Caption preset'], ['text-sfx', 'Sound effect', 'Bold display']],
  effects: [['effect-focus', 'Focus lines', 'Radial rays'], ['effect-speed', 'Speed lines', 'Directional lines'], ['effect-motion', 'Motion lines', 'Parallel motion'], ['effect-gradient', 'Gradient overlay', 'Two colors'], ['effect-flash', 'Flash', 'Radial burst'], ['effect-vignette', 'Vignette', 'Dark edges'], ['effect-solid', 'Solid overlay', 'Color wash']],
  templates: [['panel-rectangle', '1 panel', 'Single sharp panel'], ['panel-rounded', 'Rounded panel', 'Single rounded panel']],
};
function ToolOptions({ tool, open, close, begin, keepAdding, setKeepAdding }: { tool: Tool; open: boolean; close: () => void; begin: (kind: PlacementKind) => void; keepAdding: boolean; setKeepAdding: (value: boolean) => void }) {
  const options = optionGroups[tool] ?? [];
  return <aside data-testid="tool-options" className={`asset-panel ${open ? 'open' : ''}`}><button className="drawer-close" onClick={close}><X /></button><h2>{tool[0].toUpperCase() + tool.slice(1)}</h2>{options.length ? <>{options.map(([kind, name, detail]) => <button className="option-card" data-testid={`option-${kind}`} key={kind} onClick={() => begin(kind)}><b>{name}</b><small>{detail}</small><span>Add</span></button>)}<label className="keep-adding"><input type="checkbox" checked={keepAdding} onChange={event => setKeepAdding(event.target.checked)} /> Keep adding after placement</label></> : <div className="hint"><b>{tool === 'hand' ? 'Navigate canvas' : 'Select and edit'}</b><p>{tool === 'hand' ? 'Drag with one finger to scroll the workspace. Pinch in Safari to zoom the page, or use the zoom controls.' : 'Tap an object to select it. Drag handles to resize and rotate.'}</p></div>}</aside>;
}

function LayersPanel({ layers, selected, canvas, sync }: { layers: LayerInfo[]; selected: string[]; canvas: Canvas | null; sync: () => void }) {
  const objectFor = (layer: LayerInfo) => canvas?.getObjects().find(object => (object as FObj).data?.id === layer.id);
  return <div className="layers">{layers.length === 0 ? <div className="no-layers"><LayersIcon /><p>Your layers appear here</p></div> : layers.map(layer => <div className={`layer ${selected.includes(layer.id) ? 'selected' : ''}`} key={layer.id} onClick={() => { const object = objectFor(layer); if (object && canvas) { canvas.setActiveObject(object); canvas.requestRenderAll(); canvas.fire('selection:created', { selected: [object] }); } }}><span className={`kind ${layer.kind}`}>{layer.kind[0].toUpperCase()}</span><div><b>{layer.name}</b><small>{layer.kind}</small></div><button onClick={event => { event.stopPropagation(); const object = objectFor(layer); if (object) object.visible = !object.visible; canvas?.requestRenderAll(); sync(); }}>{layer.visible ? <Eye /> : <EyeOff />}</button><button onClick={event => { event.stopPropagation(); const object = objectFor(layer); if (object) object.set({ selectable: !object.selectable, evented: !object.evented }); sync(); }}>{layer.locked ? <Lock /> : <Unlock />}</button><button onClick={event => { event.stopPropagation(); const object = objectFor(layer); if (object && canvas) { canvas.remove(object); canvas.add(object); sync(); } }}><ChevronsUp /></button><button onClick={event => { event.stopPropagation(); const object = objectFor(layer); if (object && canvas) { canvas.remove(object); canvas.insertAt(0, object); sync(); } }}><ChevronsDown /></button></div>)}</div>;
}

function NumberField({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) { return <label>{label}<input type="number" value={Math.round(value * 100) / 100} min={min} max={max} step={step} onChange={event => onChange(Number(event.target.value))} /></label>; }
function Properties({ object, doc, setDoc, update, updatePanel, updateEffect, remove, duplicate }: { object: FObj | null; doc: DocumentSettings; setDoc: (doc: DocumentSettings) => void; update: (key: string, value: string | number | boolean) => void; updatePanel: (patch: Partial<ObjectData>) => void; updateEffect: (patch: Partial<EffectConfig>) => void; remove: () => void; duplicate: () => void }) {
  if (!object) return <div className="props"><h3>Canvas</h3><div className="grid"><NumberField label="Width" value={doc.width} min={100} onChange={width => setDoc({ ...doc, width })} /><NumberField label="Height" value={doc.height} min={100} onChange={height => setDoc({ ...doc, height })} /></div><label>Background<input type="color" value={doc.bg} onChange={event => setDoc({ ...doc, bg: event.target.value })} /></label></div>;
  const kind = object.data?.kind;
  return <div className="props"><div className="prop-title"><span className={`kind ${kind}`}>{kind?.[0].toUpperCase()}</span><div><h3>{object.data?.name}</h3><small>{kind}</small></div></div><h4>Transform</h4><div className="grid"><NumberField label="X" value={object.left} onChange={value => update('left', value)} /><NumberField label="Y" value={object.top} onChange={value => update('top', value)} /><NumberField label="Width" value={object.width * object.scaleX} min={1} onChange={value => update('scaleX', value / object.width)} /><NumberField label="Height" value={object.height * object.scaleY} min={1} onChange={value => update('scaleY', value / object.height)} /><NumberField label="Rotation" value={object.angle} onChange={value => update('angle', value)} /><NumberField label="Opacity" value={object.opacity} min={0} max={1} step={.05} onChange={value => update('opacity', value)} /></div>
    {kind === 'panel' && <PanelProperties object={object} update={update} updatePanel={updatePanel} />}
    {kind === 'effect' && object.data?.effect && <EffectProperties config={object.data.effect} update={updateEffect} />}
    {kind === 'text' && <><h4>Typography</h4><label>Text<textarea value={(object as Textbox).text} onChange={event => update('text', event.target.value)} /></label><NumberField label="Font size" value={(object as Textbox).fontSize ?? 32} onChange={value => update('fontSize', value)} /></>}
    {kind === 'image' && <><h4>Image</h4><div className="button-grid"><button onClick={() => update('flipX', !object.flipX)}>Flip horizontal</button><button onClick={() => update('flipY', !object.flipY)}>Flip vertical</button></div></>}
    <h4>Actions</h4><div className="button-grid"><button onClick={() => update('selectable', !object.selectable)}>{object.selectable ? <Lock /> : <Unlock />}{object.selectable ? 'Lock' : 'Unlock'}</button><button onClick={duplicate}><Copy />Duplicate</button><button className="danger" onClick={remove}><Trash2 />Delete</button></div></div>;
}
function PanelProperties({ object, update, updatePanel }: { object: FObj; update: (key: string, value: string | number | boolean) => void; updatePanel: (patch: Partial<ObjectData>) => void }) {
  const data = object.data!;
  return <><h4>Panel appearance</h4><div className="preset-row"><button onClick={() => updatePanel({ radius: 0, borderEnabled: true })}>Sharp</button><button onClick={() => updatePanel({ radius: 12 })}>Slight</button><button onClick={() => updatePanel({ radius: 40 })}>Rounded</button><button onClick={() => updatePanel({ borderEnabled: false })}>Borderless</button><button onClick={() => { update('stroke', '#000000'); updatePanel({ borderEnabled: true }); }}>Black border</button><button onClick={() => { update('stroke', '#ffffff'); updatePanel({ borderEnabled: true }); }}>White border</button></div><div className="grid"><label>Fill<input type="color" value={typeof object.fill === 'string' && object.fill.startsWith('#') ? object.fill : '#ffffff'} onChange={event => update('fill', event.target.value)} /></label><NumberField label="Fill opacity" value={data.fillOpacity ?? 1} min={0} max={1} step={.05} onChange={value => { updatePanel({ fillOpacity: value }); update('fill', `rgba(255,255,255,${value})`); }} /><label>Stroke<input type="color" value={typeof object.stroke === 'string' ? object.stroke : '#111111'} onChange={event => update('stroke', event.target.value)} /></label><NumberField label="Stroke width" value={object.strokeWidth} min={0} onChange={value => update('strokeWidth', value)} /><NumberField label="Corner radius" value={data.radius ?? 0} min={0} onChange={radius => updatePanel({ radius })} /><label>Border style<select value={data.borderStyle ?? 'solid'} onChange={event => updatePanel({ borderStyle: event.target.value as 'solid' | 'dashed' })}><option value="solid">Solid</option><option value="dashed">Dashed</option></select></label></div><label className="check"><input type="checkbox" checked={data.borderEnabled ?? true} onChange={event => updatePanel({ borderEnabled: event.target.checked })} /> Border enabled</label><label className="check"><input type="checkbox" checked={data.lockAspect ?? false} onChange={event => updatePanel({ lockAspect: event.target.checked })} /> Lock aspect ratio</label></>;
}
function EffectProperties({ config, update }: { config: EffectConfig; update: (patch: Partial<EffectConfig>) => void }) {
  const number = (label: string, key: string, value: number, min = 0, max?: number) => <NumberField label={label} value={value} min={min} max={max} onChange={next => update({ [key]: next } as Partial<EffectConfig>)} />;
  if (config.type === 'focus') return <><h4>Focus lines</h4><div className="grid">{number('Center X', 'centerX', config.centerX)}{number('Center Y', 'centerY', config.centerY)}{number('Line count', 'lineCount', config.lineCount, 3, 200)}{number('Inner radius', 'innerRadius', config.innerRadius)}{number('Outer radius', 'outerRadius', config.outerRadius)}{number('Line length', 'lineLength', config.lineLength)}{number('Stroke width', 'strokeWidth', config.strokeWidth, .5)}{number('Angle offset', 'angleOffset', config.angleOffset, -360, 360)}{number('Length variation', 'randomLength', config.randomLength)}{number('Angle variation', 'randomAngle', config.randomAngle)}</div><ColorOpacity color={config.color} opacity={config.opacity} update={update} /></>;
  if (config.type === 'speed' || config.type === 'motion') return <><h4>{config.type === 'speed' ? 'Speed' : 'Motion'} lines</h4><div className="grid">{number('Direction', 'angle', config.angle, -360, 360)}{number('Line count', 'lineCount', config.lineCount, 2, 200)}{number('Min length', 'minLength', config.minLength)}{number('Max length', 'maxLength', config.maxLength)}{number('Stroke width', 'strokeWidth', config.strokeWidth, .5)}{number('Spacing', 'spacing', config.spacing)}{number('Randomness', 'randomness', config.randomness)}{number('Spread', 'spread', config.spread)}</div><ColorOpacity color={config.color} opacity={config.opacity} update={update} /></>;
  if (config.type === 'gradient') return <><h4>Gradient overlay</h4><div className="grid"><label>Start color<input type="color" value={config.startColor} onChange={event => update({ startColor: event.target.value } as Partial<EffectConfig>)} /></label><label>End color<input type="color" value={config.endColor} onChange={event => update({ endColor: event.target.value } as Partial<EffectConfig>)} /></label>{number('Direction', 'direction', config.direction, -360, 360)}{number('Opacity', 'opacity', config.opacity, 0, 1)}{number('Width', 'width', config.width, 1)}{number('Height', 'height', config.height, 1)}</div><label>Blend mode<select value={config.blendMode} onChange={event => update({ blendMode: event.target.value as GradientEffectConfig['blendMode'] } as Partial<EffectConfig>)}><option value="source-over">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option></select></label></>;
  const vignette = config as VignetteEffectConfig;
  return <><h4>Vignette</h4><div className="grid">{number('Intensity', 'intensity', vignette.intensity, 0, 1)}{number('Radius', 'radius', vignette.radius, 1)}{number('Softness', 'softness', vignette.softness, 0, 1)}{number('Opacity', 'opacity', vignette.opacity, 0, 1)}</div><label>Color<input type="color" value={vignette.color} onChange={event => update({ color: event.target.value } as Partial<EffectConfig>)} /></label></>;
}
function ColorOpacity({ color, opacity, update }: { color: string; opacity: number; update: (patch: Partial<EffectConfig>) => void }) { return <div className="grid"><label>Color<input type="color" value={color} onChange={event => update({ color: event.target.value } as Partial<EffectConfig>)} /></label><NumberField label="Opacity" value={opacity} min={0} max={1} step={.05} onChange={value => update({ opacity: value } as Partial<EffectConfig>)} /></div>; }
function ExportDialog({ doc, setDoc, format, setFormat, quality, setQuality, scale, setScale, split, setSplit, close, run }: { doc: DocumentSettings; setDoc: (doc: DocumentSettings) => void; format: 'png' | 'jpeg'; setFormat: (format: 'png' | 'jpeg') => void; quality: number; setQuality: (value: number) => void; scale: number; setScale: (value: number) => void; split: number; setSplit: (value: number) => void; close: () => void; run: () => void }) { return <div className="modal"><div><h2>Export episode</h2><label>Filename<input value={doc.name} onChange={event => setDoc({ ...doc, name: event.target.value })} /></label><div className="row"><label>Format<select value={format} onChange={event => setFormat(event.target.value as 'png' | 'jpeg')}><option value="png">PNG</option><option value="jpeg">JPG</option></select></label><label>Scale<select value={scale} onChange={event => setScale(Number(event.target.value))}><option value="1">1×</option><option value="2">2×</option></select></label></div>{format === 'jpeg' && <label>JPG quality<input type="range" min=".3" max="1" step=".05" value={quality} onChange={event => setQuality(Number(event.target.value))} /></label>}<NumberField label="Slice height" value={split} min={256} onChange={setSplit} /><div className="actions"><button onClick={close}>Cancel</button><button className="primary" onClick={run}>Export ZIP</button></div></div></div>; }
