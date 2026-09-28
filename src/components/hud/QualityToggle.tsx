'use client';

import { useSyncExternalStore } from 'react';
import { BsStars } from 'react-icons/bs';
import {
  getDeviceSnapshot,
  getServerDeviceSnapshot,
  setLowPowerPreference,
  subscribeDevice,
} from '@/lib/device';

/** Lets a visitor turn the WebGL scene off (or back on) and remembers the
 *  choice. Matters on laptops and phones where a continuous render loop is a
 *  real battery cost, and gives anyone whose GPU struggles a way out. */
export default function QualityToggle() {
  const { lowPower } = useSyncExternalStore(
    subscribeDevice,
    getDeviceSnapshot,
    getServerDeviceSnapshot,
  );

  return (
    <button
      type="button"
      onClick={() => setLowPowerPreference(!lowPower)}
      aria-pressed={!lowPower}
      title={lowPower ? 'Turn the 3D scene on' : 'Turn the 3D scene off'}
      className="panel-solid panel-hover pointer-events-auto flex h-9 items-center gap-2 rounded-full px-3 text-slate-300 hover:text-nova"
    >
      <BsStars className={`h-4 w-4 ${lowPower ? 'opacity-40' : 'text-nova'}`} aria-hidden="true" />
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em]">
        {lowPower ? '3D off' : '3D on'}
      </span>
    </button>
  );
}
