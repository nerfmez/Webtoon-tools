export type PanelStyle = 'square' | 'rounded' | 'borderless' | 'filled';

export function panelAppearance(style: PanelStyle, radius: number) {
  const cornerRadius = style === 'square' ? 0 : Math.max(0, radius);
  return {
    rx: cornerRadius,
    ry: cornerRadius,
    strokeWidth: style === 'borderless' ? 0 : 8,
    fill: style === 'filled' ? '#ffffff' : style === 'borderless' ? 'rgba(17,24,39,.08)' : 'rgba(255,255,255,.02)',
  };
}

export function effectOpacity(value: number) {
  return Math.max(0.05, Math.min(1, value));
}

export function viewportObjectPosition(
  page:{width:number;height:number},
  viewport:{left:number;top:number;width:number;height:number},
  canvas:{left:number;top:number},
  zoom:number,
  object:{width:number;height:number},
){
  const visibleLeft=Math.max(0,(viewport.left-canvas.left)/zoom);
  const visibleTop=Math.max(0,(viewport.top-canvas.top)/zoom);
  const visibleWidth=Math.min(page.width,viewport.width/zoom);
  const visibleHeight=viewport.height/zoom;
  return{
    left:Math.max(20,Math.min(page.width-object.width-20,visibleLeft+(visibleWidth-object.width)/2)),
    top:Math.max(40,Math.min(page.height-object.height-40,visibleTop+Math.min(140,visibleHeight*.18))),
  };
}
