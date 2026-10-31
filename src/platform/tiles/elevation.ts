import { bilinear, demPixel } from '@core/geo/dem';
import type { Basemap } from '@core/model/basemap';
import type { TileLoader } from './loader';

/** Открытые тайлы рельефа (Terrarium, AWS). Те же, что в СКАТ 6.x. */
export const DEM: Basemap = {
  id: 'dem',
  name: 'Высоты',
  url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  maxZoom: 15,
  attribution: 'Mapzen, AWS Terrain Tiles',
};

const decoded = new Map<string, Promise<Uint8ClampedArray>>();

async function decode(buf: ArrayBuffer): Promise<Uint8ClampedArray> {
  const img = await createImageBitmap(new Blob([buf]), {
    colorSpaceConversion: 'none',
    premultiplyAlpha: 'none',
  });
  const c =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(256, 256)
      : Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
  const g = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null;
  if (!g) throw new Error('Нет 2D-контекста');
  g.drawImage(img, 0, 0);
  img.close();
  return g.getImageData(0, 0, 256, 256).data;
}

/** Высота точки, м. Сначала подробный уровень из сети или кэша, затем сохранённые более грубые. null — нет данных. */
export async function elevation(loader: TileLoader, lat: number, lon: number): Promise<number | null> {
  for (let z = DEM.maxZoom; z >= 9; z--) {
    const p = demPixel(lat, lon, z);
    const key = `${z}/${p.tx}/${p.ty}`;
    let data = decoded.get(key);
    if (!data) {
      const buf = await loader.raw(DEM, z, p.tx, p.ty, undefined, z < DEM.maxZoom).catch(() => null);
      if (!buf) continue;
      data = decode(buf);
      if (decoded.size > 64) decoded.delete(decoded.keys().next().value as string);
      decoded.set(key, data);
    }
    try {
      const h = bilinear(await data, p.fx, p.fy);
      if (Number.isFinite(h) && h > -500) return h;
    } catch {
      decoded.delete(key);
    }
  }
  return null;
}
