'use client';

import { useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { getDeviceSnapshot, getServerDeviceSnapshot, subscribeDevice } from '@/lib/device';
import { useCosmos } from '@/lib/store';

// The scene pulls in three, r3f, drei and postprocessing. Loading it only in
// the browser keeps it out of the server bundle entirely and off the critical
// path for first paint — the static backdrop below covers the gap.
const CosmosScene = dynamic(() => import('./CosmosScene'), { ssr: false });

/** Fixed, full-viewport backdrop that the page content scrolls over. */
export default function CosmosBackdrop() {
  // Device capability and the motion preference are external state, not React
  // state — reading them through useSyncExternalStore avoids a setState-in-
  // effect cascade and keeps SSR rendering the static fallback.
  const { quality, lowPower } = useSyncExternalStore(
    subscribeDevice,
    getDeviceSnapshot,
    getServerDeviceSnapshot,
  );
  const sceneReady = useCosmos((state) => state.sceneReady);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      {/* Always rendered underneath: it is the first paint, and the fallback
          whenever the scene is off or WebGL is unavailable. */}
      <div className="absolute inset-0 bg-void">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(59,31,110,0.45),transparent_55%),radial-gradient(ellipse_at_75%_70%,rgba(13,79,110,0.4),transparent_60%)]" />
        <div className="starfield-fallback absolute inset-0" />
      </div>

      {!lowPower && (
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            sceneReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <CosmosScene quality={quality} />
        </div>
      )}

      {/* Scrims over the scene, under the page content. The star is bright
          enough to wash out the HUD entirely when it drifts behind the nav
          rail or the readout, so these darken just those gutters. */}
      <div className="absolute inset-y-0 left-0 w-[26rem] bg-gradient-to-r from-void/85 via-void/45 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-void/75 to-transparent" />
    </div>
  );
}
