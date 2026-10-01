/** Ship cosmetics for the Space Invaders minigame.
 *
 *  Deliberately dependency-free and side-effect-free at module load: no
 *  'use client', no browser APIs, no react-icons. It is imported both by the
 *  client game/Hangar UI *and* server-side by `lib/knowledge.ts` (so NOVA can
 *  recite one hidden unlock code from the same source of truth). Keep it that
 *  way — same discipline as `skills.ts` / `skill-icons.ts`.
 *
 *  The persisted state (which cosmetics are unlocked, and which is selected)
 *  lives in the game store in `lib/game.ts`, mirroring the `highScore`
 *  localStorage pattern there. */

export type ShipShape = 'chevron' | 'delta' | 'double';

export interface Cosmetic {
  id: string;
  /** Display name shown in the Hangar. */
  name: string;
  /** Fill colour for the ship hull. */
  color: string;
  /** Colour of the bullets this ship fires. */
  bulletColor: string;
  /** Silhouette drawn by `drawShip`. */
  shape: ShipShape;
  /** Unlock code (compared case-insensitively, trimmed), or `null` when the
   *  cosmetic is available from the very start. */
  code: string | null;
  /** One-line flavour shown under the ship in the Hangar. */
  blurb: string;
}

/** The catalogue. The first entry is the default and is always unlocked.
 *  Codes are hidden around the site — see the project notes / final report. */
export const COSMETICS: Cosmetic[] = [
  {
    id: 'standard',
    name: 'Nova Standard',
    color: '#7fe7ff',
    bulletColor: '#ffb347',
    shape: 'chevron',
    code: null,
    blurb: 'Factory hull. Reliable cyan chevron.',
  },
  {
    id: 'phantom',
    name: 'Relay Phantom',
    color: '#f472b6',
    bulletColor: '#ffb0d8',
    shape: 'chevron',
    code: 'NEBULA',
    blurb: 'Magenta stealth plating from the relay yards.',
  },
  {
    id: 'solar',
    name: 'Solar Hull',
    color: '#ffb347',
    bulletColor: '#fff0c2',
    shape: 'chevron',
    code: 'SOLFLARE',
    blurb: 'Amber heat-shield forged close to the star.',
  },
  {
    id: 'verdant',
    name: 'Verdant Interceptor',
    color: '#5eead4',
    bulletColor: '#a7fff0',
    shape: 'delta',
    code: 'WARPCORE',
    blurb: 'A finned delta wing. Faster than it looks.',
  },
  {
    id: 'wraith',
    name: 'Plasma Wraith',
    color: '#c4a3ff',
    bulletColor: '#e0b3ff',
    shape: 'double',
    code: 'PULSAR',
    blurb: 'Twin-chevron plasma frame. Pure show-off.',
  },
];

export const DEFAULT_COSMETIC_ID = COSMETICS[0].id;

export function cosmeticById(id: string): Cosmetic {
  return COSMETICS.find((c) => c.id === id) ?? COSMETICS[0];
}

/** Returns the cosmetic whose code matches the typed string, or `null`.
 *  Match is case-insensitive and whitespace-trimmed; entries with no code
 *  (the default) never match. */
export function cosmeticForCode(input: string): Cosmetic | null {
  const code = input.trim().toUpperCase();
  if (!code) return null;
  return COSMETICS.find((c) => c.code !== null && c.code.toUpperCase() === code) ?? null;
}

/** Draws a ship silhouette pointing up, filling the given bounding box.
 *  Caller sets any blink/alpha state; this only sets `fillStyle` and paints.
 *  Pure canvas-2D, matching the minigame's chunky vector aesthetic. */
export function drawShip(
  ctx: CanvasRenderingContext2D,
  shape: ShipShape,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;

  if (shape === 'chevron') {
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (shape === 'delta') {
    // Spearhead with a notched tail and swept side fins.
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w * 0.62, y + h * 0.82);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x + w * 0.38, y + h * 0.82);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    return;
  }

  // 'double' — two stacked chevrons for a layered look.
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + h * 0.4);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w * 0.22, y + h * 0.52);
  ctx.lineTo(x + w * 0.78, y + h * 0.52);
  ctx.closePath();
  ctx.fill();
}
