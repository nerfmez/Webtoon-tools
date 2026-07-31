export type Tool='select'|'hand'|'image'|'panel'|'bubble'|'text'|'effects'|'templates';
export type LayerKind='image'|'panel'|'bubble'|'text'|'effect'|'group';
export interface LayerInfo { id:string; name:string; kind:LayerKind; visible:boolean; locked:boolean }
export interface ProjectData { version:1; name:string; width:number; height:number; background:string; canvas:Record<string,unknown>; savedAt:string }
export interface ExportSlice { index:number; y:number; height:number; filename:string }
