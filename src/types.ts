export type Tool='select'|'hand'|'image'|'panel'|'bubble'|'text'|'effects'|'templates';
export type LayerKind='image'|'panel'|'bubble'|'text'|'effect'|'group';
export interface LayerInfo { id:string; name:string; kind:LayerKind; visible:boolean; locked:boolean }
export interface ProjectData { version:1; name:string; width:number; height:number; background:string; canvas:Record<string,unknown>; savedAt:string }
export interface ExportSlice { index:number; y:number; height:number; filename:string }

export type PlacementKind =
  | 'panel-rectangle' | 'panel-rounded' | 'panel-borderless' | 'panel-filled'
  | 'bubble-speech' | 'bubble-rounded' | 'bubble-thought' | 'bubble-shout' | 'bubble-narration'
  | 'text-dialogue' | 'text-narration' | 'text-sfx'
  | 'effect-focus' | 'effect-speed' | 'effect-motion' | 'effect-gradient'
  | 'effect-flash' | 'effect-vignette' | 'effect-solid';

export interface FocusEffectConfig {
  type:'focus'; centerX:number; centerY:number; lineCount:number; innerRadius:number;
  outerRadius:number; lineLength:number; strokeWidth:number; color:string; opacity:number;
  angleOffset:number; randomLength:number; randomAngle:number;
}
export interface SpeedEffectConfig {
  type:'speed'|'motion'; angle:number; lineCount:number; minLength:number; maxLength:number;
  strokeWidth:number; spacing:number; color:string; opacity:number; randomness:number; spread:number;
}
export interface GradientEffectConfig {
  type:'gradient'; startColor:string; endColor:string; direction:number; opacity:number;
  blendMode:'source-over'|'multiply'|'screen'|'overlay'; width:number; height:number;
}
export interface VignetteEffectConfig {
  type:'vignette'; intensity:number; radius:number; softness:number; color:string; opacity:number;
}
export type EffectConfig=FocusEffectConfig|SpeedEffectConfig|GradientEffectConfig|VignetteEffectConfig;
