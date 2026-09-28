'use client';

import { create } from 'zustand';
import { sections } from '@/data/sections';
import type { SectionId } from '@/types';

interface CosmosState {
  /** Scroll position expressed as a fractional index into `sections`, so
   *  `1.5` means "halfway between Kepler and Chronos". The camera rig reads
   *  this every frame via `getState()` rather than subscribing, which keeps
   *  scrolling off React's render path entirely. */
  progress: number;
  /** Nearest whole section — the one the HUD highlights. This *is* a
   *  subscribed value, but it only changes a handful of times per page. */
  activeId: SectionId;
  /** False until the first frame has rendered, used to fade the scene in. */
  sceneReady: boolean;
  setProgress: (progress: number) => void;
  setSceneReady: (ready: boolean) => void;
}

const LAST_INDEX = sections.length - 1;

export const useCosmos = create<CosmosState>((set, get) => ({
  progress: 0,
  activeId: 'home',
  sceneReady: false,

  setProgress: (progress) => {
    const clamped = Math.min(LAST_INDEX, Math.max(0, progress));
    const activeId = sections[Math.round(clamped)].id;
    // Only touch `activeId` when it actually changes, so scroll events don't
    // re-render every HUD subscriber 60 times a second.
    if (get().activeId === activeId) {
      set({ progress: clamped });
    } else {
      set({ progress: clamped, activeId });
    }
  },

  setSceneReady: (sceneReady) => set({ sceneReady }),
}));

/** Reads progress without subscribing — for use inside `useFrame`. */
export const getProgress = () => useCosmos.getState().progress;
