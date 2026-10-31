import { manifest as operator } from '@modes/operator/index';
import { manifest as combat } from '@modes/combat/index';
import { manifest as maket } from '@modes/maket/index';
import { manifest as shtab } from '@modes/shtab/index';
import type { ModeId, ModeManifest } from '@kit/mode/manifest';

/** Режимы в порядке показа на экране выбора. */
export const MODES: readonly ModeManifest[] = [operator, combat, maket, shtab];

export function findMode(id: string): ModeManifest | undefined {
  return MODES.find((m) => m.id === (id as ModeId));
}
