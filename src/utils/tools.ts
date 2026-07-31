export type PanelStyle = 'square' | 'rounded' | 'borderless' | 'filled';

export function panelAppearance(style: PanelStyle, radius: number) {
  const cornerRadius = style === 'square' ? 0 : Math.max(0, radius);
  return {
    rx: cornerRadius,
    ry: cornerRadius,
    strokeWidth: style === 'borderless' ? 0 : 8,
    fill: style === 'filled' ? '#ffffff' : 'rgba(255,255,255,.02)',
  };
}

export function effectOpacity(value: number) {
  return Math.max(0.05, Math.min(1, value));
}
