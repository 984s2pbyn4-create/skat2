import {
  LSPEC,
  SIDES,
  SYM_BY,
  SYM_DEF,
  decorLine,
  drawSym,
  symCol,
  type LineSpec,
  type SymDef,
} from './engine6';
import type { ObjKind, Side } from '@core/model/objects';

/** Каталог знаков СКАТ 6.x: 261 знак, из них 75 линейных и площадных. */
export const SYMBOLS: readonly SymDef[] = SYM_DEF;
export const CATEGORIES: readonly string[] = [...new Set(SYM_DEF.map((s) => s.cat))];
export const symbolById = (id: string): SymDef | undefined => SYM_BY[id];

/** Прежние простые стили линий 6.x — выражены через базовые стили движка. */
const LEGACY: Record<string, LineSpec> = {
  dash: { n: '', base: 'dash' },
  dashdot: { n: '', base: 'dashdot' },
  arrow: { n: '', base: 'solid', ends: { b: ['arrow'] } },
  double: { n: '', base: 'solid', dbl: 3, ends: { b: ['arrow'] } },
  dasharrow: { n: '', base: 'dash', ends: { b: ['arrow'] } },
  dots: { n: '', base: 'none', marks: [{ t: 'ring', step: 12 }] },
  circles: { n: '', base: 'none', marks: [{ t: 'ring', step: 18 }] },
  zone: { n: '', area: true, base: 'dash' },
  solid: { n: '', area: true, base: 'solid' },
  dotsArea: { n: '', area: true, base: 'solid', fill: 'dots' },
  hatch: { n: '', area: true, base: 'solid', fill: 'hatch' },
};

export function kindOf(s: SymDef): ObjKind {
  return s.type === 'area' ? 'area' : s.type === 'line' ? 'line' : 'point';
}

export function specOf(s: SymDef): LineSpec {
  const sp = (s.style && (LSPEC[s.style] ?? LEGACY[s.style])) || { n: '', base: 'solid' };
  return s.type === 'area' && !sp.area ? { ...sp, area: true } : sp;
}

export function colorOf(sym: string, side: Side): string {
  return symCol(sym, side, SIDES[side].color);
}

/** Изображение точечного знака для карты (рамка 32×32, плотность 2). */
export function symbolImage(sym: string, side: Side): ImageData | null {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (!g || !SYM_BY[sym]) return null;
  g.scale(2, 2);
  drawSym(g, sym, 16, 16, colorOf(sym, side), null, 0, 1);
  return g.getImageData(0, 0, 64, 64);
}

const thumbs = new Map<string, string>();

/** Миниатюра для каталога: точечный знак или образец линии. */
export function thumbnail(s: SymDef, side: Side): string {
  const key = `${s.id}/${side}`;
  const cached = thumbs.get(key);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 72;
  const g = c.getContext('2d');
  if (!g) return '';
  g.scale(2, 2);
  const col = colorOf(s.id, side);
  if (kindOf(s) === 'point') drawSym(g, s.id, 32, 18, col, null, 0, 1);
  else if (kindOf(s) === 'area')
    decorLine(
      g,
      [
        { x: 8, y: 8 },
        { x: 56, y: 6 },
        { x: 58, y: 30 },
        { x: 10, y: 31 },
        { x: 8, y: 8 },
      ],
      col,
      0.55,
      specOf(s),
    );
  else
    decorLine(
      g,
      [
        { x: 4, y: 24 },
        { x: 30, y: 12 },
        { x: 60, y: 18 },
      ],
      col,
      0.55,
      specOf(s),
    );
  const url = c.toDataURL();
  thumbs.set(key, url);
  return url;
}

export { decorLine };
