/** Высоты из тайлов рельефа Terrarium (RGB-кодирование, 256×256). */
export function terrarium(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

/** Тайл и дробный пиксель внутри него для точки на уровне z (веб-Меркатор). */
export function demPixel(
  lat: number,
  lon: number,
  z: number,
): { tx: number; ty: number; fx: number; fy: number } {
  const n = 2 ** z;
  const xt = ((lon + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const yt = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  const tx = Math.floor(xt);
  const ty = Math.floor(yt);
  return {
    tx,
    ty,
    fx: Math.min(254.999, Math.max(0, (xt - tx) * 256 - 0.5)),
    fy: Math.min(254.999, Math.max(0, (yt - ty) * 256 - 0.5)),
  };
}

/** Билинейная интерполяция высоты по пикселям RGBA тайла. */
export function bilinear(rgba: ArrayLike<number>, fx: number, fy: number): number {
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const ax = fx - ix;
  const ay = fy - iy;
  const h = (px: number, py: number) => {
    const o = (py * 256 + px) * 4;
    return terrarium(rgba[o] ?? 0, rgba[o + 1] ?? 0, rgba[o + 2] ?? 0);
  };
  return (
    h(ix, iy) * (1 - ax) * (1 - ay) +
    h(ix + 1, iy) * ax * (1 - ay) +
    h(ix, iy + 1) * (1 - ax) * ay +
    h(ix + 1, iy + 1) * ax * ay
  );
}
