'use client';

import { useEffect } from 'react';

// Module-level guard so React Strict Mode's double-mount (and any remount)
// prints the transmission exactly once per page load.
let printed = false;

/** A styled console greeting for the curious visitor who opens devtools.
 *  It carries one Hangar unlock code, base64-encoded, with a nudge to decode
 *  it. Renders nothing; purely a one-shot side effect on mount. */
export default function ConsoleEasterEgg() {
  useEffect(() => {
    if (printed || typeof window === 'undefined') return;
    printed = true;

    const header =
      'color:#7fe7ff;font:600 13px ui-monospace,monospace;text-shadow:0 0 6px rgba(127,231,255,.4)';
    const body = 'color:#94a3b8;font:12px ui-monospace,monospace';
    const code = 'color:#f472b6;font:600 12px ui-monospace,monospace';

    // "TkVCVUxB" === btoa('NEBULA'). Left encoded so the reward is for decoding.
    console.log('%cNOVA // hangar transmission', header);
    console.log(
      '%cA ship skin is waiting. Decode this and feed it to the Hangar:\n%cTkVCVUxB%c  (base64)',
      body,
      code,
      body,
    );
    console.log('%cTry: atob("TkVCVUxB")', body);
  }, []);

  return null;
}
