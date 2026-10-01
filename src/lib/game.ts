'use client';

import { create } from 'zustand';
import {
  COSMETICS,
  DEFAULT_COSMETIC_ID,
  cosmeticForCode,
  type Cosmetic,
} from '@/lib/cosmetics';

export type GamePhase = 'idle' | 'playing' | 'cleared' | 'lost';

export interface GameState {
  phase: GamePhase;
  score: number;
  lives: number;
  wave: number;
  /** Best score ever on this device. Persisted to localStorage; 0 when
   *  storage is unavailable or nothing has been recorded yet. */
  highScore: number;
  /** Ids of every cosmetic the player has unlocked. Always contains the
   *  default. Persisted to localStorage; graceful when storage is blocked. */
  unlockedCosmetics: string[];
  /** Id of the cosmetic the ship currently wears. Persisted. */
  selectedCosmetic: string;
  startGame: () => void;
  addScore: (points: number) => void;
  loseLife: () => void;
  /** Marks the current wave cleared — a transition state, not a win. The
   *  wave number is bumped later by `nextWave`, so `wave` still names the
   *  wave the player just finished while this transition is on screen. */
  winWave: () => void;
  /** Advances to the next, harder wave, keeping score and lives. */
  nextWave: () => void;
  resetGame: () => void;
  /** Attempts to unlock a cosmetic from a typed code. Returns the matched
   *  cosmetic on success (or if already unlocked), or `null` for a miss —
   *  wrong codes fail quietly and are never punished. */
  redeemCode: (input: string) => Cosmetic | null;
  /** Equips an already-unlocked cosmetic. No-op for a locked id. */
  selectCosmetic: (id: string) => void;
}

const INITIAL_LIVES = 3;
const HIGH_SCORE_KEY = 'cosmos:invaders-highscore';
const COSMETICS_KEY = 'cosmos:invaders-cosmetics';

function readHighScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    const value = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    // Private mode / blocked storage: fall back to an in-memory best.
    return 0;
  }
}

function writeHighScore(value: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(value));
  } catch {
    // Not persisting is acceptable; the store still holds it for this session.
  }
}

interface CosmeticsSave {
  unlocked: string[];
  selected: string;
}

const KNOWN_IDS = new Set(COSMETICS.map((c) => c.id));

/** Reads the persisted cosmetics, always guaranteeing the default is unlocked
 *  and that the selection points at something the player actually owns.
 *  Unknown ids (from an older catalogue) are dropped. */
function readCosmetics(): CosmeticsSave {
  const fallback: CosmeticsSave = { unlocked: [DEFAULT_COSMETIC_ID], selected: DEFAULT_COSMETIC_ID };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(COSMETICS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<CosmeticsSave>;
    const unlocked = Array.isArray(parsed.unlocked)
      ? parsed.unlocked.filter((id): id is string => typeof id === 'string' && KNOWN_IDS.has(id))
      : [];
    if (!unlocked.includes(DEFAULT_COSMETIC_ID)) unlocked.push(DEFAULT_COSMETIC_ID);
    const selected =
      typeof parsed.selected === 'string' && unlocked.includes(parsed.selected)
        ? parsed.selected
        : DEFAULT_COSMETIC_ID;
    return { unlocked, selected };
  } catch {
    // Blocked storage or malformed JSON: start fresh in memory.
    return fallback;
  }
}

function writeCosmetics(save: CosmeticsSave): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COSMETICS_KEY, JSON.stringify(save));
  } catch {
    // Not persisting is acceptable; the store still holds it for this session.
  }
}

const initialCosmetics = readCosmetics();

export const useGame = create<GameState>((set, get) => ({
  phase: 'idle',
  score: 0,
  lives: INITIAL_LIVES,
  wave: 1,
  highScore: readHighScore(),
  unlockedCosmetics: initialCosmetics.unlocked,
  selectedCosmetic: initialCosmetics.selected,

  startGame: () => set({ phase: 'playing', score: 0, lives: INITIAL_LIVES, wave: 1 }),
  addScore: (points) =>
    set((s) => {
      const score = s.score + points;
      if (score > s.highScore) {
        writeHighScore(score);
        return { score, highScore: score };
      }
      return { score };
    }),
  loseLife: () =>
    set((s) => {
      const lives = s.lives - 1;
      return { lives, phase: lives <= 0 ? 'lost' : s.phase };
    }),
  winWave: () => set({ phase: 'cleared' }),
  nextWave: () => set((s) => ({ phase: 'playing', wave: s.wave + 1 })),
  resetGame: () => set({ phase: 'idle', score: 0, lives: INITIAL_LIVES, wave: 1 }),

  redeemCode: (input) => {
    const match = cosmeticForCode(input);
    if (!match) return null;
    const { unlockedCosmetics, selectedCosmetic } = get();
    if (!unlockedCosmetics.includes(match.id)) {
      const unlocked = [...unlockedCosmetics, match.id];
      writeCosmetics({ unlocked, selected: selectedCosmetic });
      set({ unlockedCosmetics: unlocked });
    }
    return match;
  },

  selectCosmetic: (id) => {
    const { unlockedCosmetics } = get();
    if (!unlockedCosmetics.includes(id)) return;
    writeCosmetics({ unlocked: unlockedCosmetics, selected: id });
    set({ selectedCosmetic: id });
  },
}));
