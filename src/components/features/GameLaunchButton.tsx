'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { BsController, BsRocket, BsTrophy } from 'react-icons/bs';
import Hangar from '@/components/features/Hangar';
import Leaderboard from '@/components/features/Leaderboard';
import { getDeviceSnapshot, getServerDeviceSnapshot, subscribeDevice } from '@/lib/device';
import { useGame } from '@/lib/game';
import { useCosmos } from '@/lib/store';

export default function GameLaunchButton() {
  const gameActive = useCosmos((state) => state.gameActive);
  const setGameActive = useCosmos((state) => state.setGameActive);
  const { lowPower } = useSyncExternalStore(
    subscribeDevice,
    getDeviceSnapshot,
    getServerDeviceSnapshot,
  );

  const buttonRef = useRef<HTMLButtonElement>(null);
  const hangarButtonRef = useRef<HTMLButtonElement>(null);
  const leaderboardButtonRef = useRef<HTMLButtonElement>(null);
  const wasActive = useRef(false);
  const [hangarOpen, setHangarOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  // When the game exits, focus falls back to <body>. Return it to the launch
  // button so keyboard users land where they left off.
  useEffect(() => {
    if (gameActive) {
      wasActive.current = true;
    } else if (wasActive.current) {
      wasActive.current = false;
      buttonRef.current?.focus();
    }
  }, [gameActive]);

  if (lowPower || gameActive) return null;

  return (
    <div className="mt-6 pt-6 border-t border-white/10">
      <p className="hud-label mb-3">Relay Station — Arcade Terminal</p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            useGame.getState().startGame();
            setGameActive(true);
          }}
          className="panel-solid panel-hover inline-flex h-10 items-center gap-2.5 rounded-full px-5 text-slate-200 hover:text-nova"
        >
          <BsController className="h-4 w-4" aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.16em]">Launch Space Invaders</span>
        </button>
        <button
          ref={hangarButtonRef}
          type="button"
          onClick={() => setHangarOpen(true)}
          className="panel-hover inline-flex h-10 items-center gap-2.5 rounded-full border border-white/10 px-5 text-slate-200 hover:text-nova"
        >
          <BsRocket className="h-4 w-4" aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.16em]">Hangar</span>
        </button>
        <button
          ref={leaderboardButtonRef}
          type="button"
          onClick={() => setLeaderboardOpen(true)}
          className="panel-hover inline-flex h-10 items-center gap-2.5 rounded-full border border-white/10 px-5 text-slate-200 hover:text-nova"
        >
          <BsTrophy className="h-4 w-4" aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.16em]">Leaderboard</span>
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Arrow keys / A-D to move · Space to fire · Esc to exit
      </p>

      {hangarOpen && (
        <Hangar
          onClose={() => {
            setHangarOpen(false);
            // Return focus to the button that opened the hangar.
            window.requestAnimationFrame(() => hangarButtonRef.current?.focus());
          }}
        />
      )}

      {leaderboardOpen && (
        <Leaderboard
          onClose={() => {
            setLeaderboardOpen(false);
            window.requestAnimationFrame(() => leaderboardButtonRef.current?.focus());
          }}
        />
      )}
    </div>
  );
}
