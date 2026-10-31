import { classifyDevice, type DeviceClass } from '@core/model/device';

/** Класс текущего устройства по признакам браузера. */
export function detectDevice(): DeviceClass {
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const shortSide = Math.min(window.screen.width, window.screen.height);
  return classifyDevice({ coarsePointer, shortSide });
}
