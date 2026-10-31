/** Знак библиотеки СКАТ 6.x: пути SVG в рамке 32×32. */
export interface SymDef {
  readonly id: string;
  /** Название. */
  readonly n: string;
  /** Сокращение. */
  readonly ab?: string;
  /** Раздел каталога. */
  readonly cat: string;
  readonly d: readonly string[];
  readonly f?: readonly string[];
  /** Линейный или площадной знак (Приложение 3) и его стиль в LSPEC. */
  readonly type?: 'line' | 'area';
  readonly style?: string;
  readonly cR?: string;
  readonly cB?: string;
}
export interface LineSpec {
  readonly n: string;
  readonly area?: boolean;
  readonly [k: string]: unknown;
}
export interface Pt {
  x: number;
  y: number;
}
export const SYM_DEF: readonly SymDef[];
export const SYM_BY: Readonly<Record<string, SymDef>>;
export const SCOL: Readonly<Record<string, string>>;
export const SIDES: { readonly r: { readonly color: string }; readonly b: { readonly color: string } };
export const LSPEC: Readonly<Record<string, LineSpec>>;
export function symCol(sid: string, side: string, def: string): string;
export function drawSym(
  g: CanvasRenderingContext2D,
  sid: string,
  x: number,
  y: number,
  color: string,
  fc: string | null,
  rot?: number,
  sc?: number,
  o?: unknown,
): void;
export function decorLine(g: CanvasRenderingContext2D, P: Pt[], c: string, k: number, sp: LineSpec): void;
