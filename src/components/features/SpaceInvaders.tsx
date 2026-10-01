'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BsX } from 'react-icons/bs';
import { useGame } from '@/lib/game';
import { cosmeticById, drawShip } from '@/lib/cosmetics';
import { useCosmos } from '@/lib/store';

// Play-field tuning. Pixels and seconds unless noted. All gameplay math reads
// the live canvas width/height, so these are layout constants, not screen ones.
const INVADER_W = 34;
const INVADER_H = 22;
const GAP_X = 30;
const GAP_Y = 26;
const GRID_TOP = 70;
const EDGE_MARGIN = 40;
const STEP_DOWN = 24;

const PLAYER_W = 38;
const PLAYER_H = 20;
const PLAYER_SPEED = 360; // px/s
const PLAYER_BOTTOM_GAP = 48;

const BULLET_W = 4;
const BULLET_H = 13;
const PLAYER_BULLET_SPEED = 460; // px/s, upward
const INVADER_BULLET_SPEED = 250; // px/s, downward

const BASE_INVADER_SPEED = 46; // px/s at full grid, wave 1
const SPEEDUP_FACTOR = 2.6; // multiplies as invaders die

const INVINCIBLE_MS = 500;

// Powerups. A destroyed invader has a small chance of dropping one, which
// drifts down toward the player; catching it applies a short effect.
const POWERUP_DROP_CHANCE = 0.14;
const POWERUP_SIZE = 16;
const POWERUP_FALL_SPEED = 95; // px/s, downward
const RAPID_MS = 6000; // rapid fire duration
const SPREAD_MS = 8000; // spread shot duration
const SHIELD_INVINCIBLE_MS = 4000; // shield pickup grace period
const SHIELD_REBUILD = 8; // bunker cells revived by a shield pickup
const RAPID_COOLDOWN_MS = 130; // min gap between shots while rapid-firing
const SPREAD_SPEED_X = 120; // horizontal drift of the fan's outer bullets

type PowerupType = 'rapid' | 'spread' | 'shield';
const POWERUP_TYPES: PowerupType[] = ['rapid', 'spread', 'shield'];
const POWERUP_COLORS: Record<PowerupType, string> = {
  rapid: '#ffb347', // solar amber
  spread: '#7fe7ff', // nova cyan
  shield: '#5eead4', // relay green
};

// Difficulty ceilings so a late wave still fits a ~1024px-wide arena.
const MAX_COLS = 9;
const MAX_ROWS = 5;

// Destructible bunkers between the player and the swarm.
const SHIELD_COUNT = 4;
const SHIELD_COLS = 6;
const SHIELD_ROWS = 3;
const SHIELD_CELL = 8;

interface Invader {
  x: number;
  y: number;
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
  /** Horizontal velocity, px/s. Zero for ordinary straight shots; non-zero
   *  for the outer bullets of a spread fan. */
  vx?: number;
}

interface ShieldCell {
  x: number;
  y: number;
  alive: boolean;
}

interface Powerup {
  x: number;
  y: number;
  type: PowerupType;
}

const COLORS = {
  void: '#04060f',
  player: '#7fe7ff',
  invader: '#f472b6',
  playerBullet: '#ffb347',
  invaderBullet: '#f472b6',
  shield: '#3fb8e6',
};

/** Per-wave difficulty. Derived from the wave number so the component stays
 *  the single place that knows how the swarm grows. */
function waveConfig(wave: number) {
  const cols = Math.min(5 + Math.floor((wave - 1) / 2), MAX_COLS);
  const rows = Math.min(3 + Math.floor(wave / 3), MAX_ROWS);
  const baseSpeed = BASE_INVADER_SPEED + (wave - 1) * 10;
  const fireMin = Math.max(1000 - (wave - 1) * 110, 380);
  const fireMax = Math.max(2000 - (wave - 1) * 170, 760);
  const doubleShot = wave >= 4; // occasional second bullet from a random invader
  return { cols, rows, baseSpeed, fireMin, fireMax, doubleShot };
}

function hit(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export default function SpaceInvaders() {
  const gameActive = useCosmos((state) => state.gameActive);
  const setGameActive = useCosmos((state) => state.setGameActive);
  const phase = useGame((state) => state.phase);
  const score = useGame((state) => state.score);
  const lives = useGame((state) => state.lives);
  const wave = useGame((state) => state.wave);
  const highScore = useGame((state) => state.highScore);

  // Score submission for the online leaderboard. Reset at the start of each run
  // so a fresh game can post again; a run's score can only be submitted once.
  const [submitName, setSubmitName] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Held input, shared between the key listeners and the RAF loop.
  const keys = useRef({ left: false, right: false, fire: false });

  const exit = useCallback(() => {
    useGame.getState().resetGame();
    setSubmitState('idle');
    setGameActive(false);
  }, [setGameActive]);

  // Starts a fresh run and clears any prior submission so the next game-over
  // screen offers the form again. Used by Play Again below.
  const playAgain = useCallback(() => {
    setSubmitState('idle');
    setSubmitName('');
    useGame.getState().startGame();
  }, []);

  const submitScore = useCallback(async () => {
    if (submitState === 'sending' || submitState === 'done') return;
    setSubmitState('sending');
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: submitName.trim(), score }),
      });
      setSubmitState(res.ok ? 'done' : 'error');
    } catch {
      setSubmitState('error');
    }
  }, [submitName, score, submitState]);

  // Lock body scroll while the overlay is up; restore whatever was there.
  useEffect(() => {
    if (!gameActive) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [gameActive]);

  // Move keyboard focus into the arcade frame when it opens, so Escape and the
  // on-screen buttons are immediately reachable.
  useEffect(() => {
    if (gameActive) dialogRef.current?.focus();
  }, [gameActive]);

  // Window-level input: movement held in the keys ref, Space fires, Escape exits.
  useEffect(() => {
    if (!gameActive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          exit();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          keys.current.left = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          keys.current.right = true;
          break;
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          keys.current.fire = true;
          break;
        default:
          break;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          keys.current.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          keys.current.right = false;
          break;
        case ' ':
        case 'Spacebar':
          keys.current.fire = false;
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gameActive, exit]);

  // "Wave cleared" is a short transition; auto-advance into the next, harder
  // wave. A Continue button in the overlay does the same thing immediately.
  useEffect(() => {
    if (phase !== 'cleared') return;
    const timer = window.setTimeout(() => useGame.getState().nextWave(), 1800);
    return () => window.clearTimeout(timer);
  }, [phase]);

  // The simulation. Runs only while actively playing; re-initialises a fresh
  // world on every transition back into 'playing' — new game, next wave, or
  // Play Again — reading the current wave's difficulty each time.
  useEffect(() => {
    if (!gameActive || phase !== 'playing') return;
    const canvas = canvasRef.current;
    const arena = arenaRef.current;
    if (!canvas || !arena) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size the backing store to the arena box, not the window. The ResizeObserver
    // keeps it in sync if the viewport (and therefore the framed arena) changes.
    const resize = () => {
      canvas.width = Math.max(1, arena.clientWidth);
      canvas.height = Math.max(1, arena.clientHeight);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(arena);

    const { cols, rows, baseSpeed, fireMin, fireMax, doubleShot } = waveConfig(wave);

    // The hull the player picked in the Hangar. Read once at init; changing it
    // mid-flight is not supported (the Hangar is a pre-launch screen).
    const cosmetic = cosmeticById(useGame.getState().selectedCosmetic);

    // Invader grid, centered horizontally near the top of the arena.
    const gridWidth = cols * INVADER_W + (cols - 1) * GAP_X;
    const startX = Math.max(EDGE_MARGIN, (canvas.width - gridWidth) / 2);
    const invaders: Invader[] = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        invaders.push({
          x: startX + col * (INVADER_W + GAP_X),
          y: GRID_TOP + row * (INVADER_H + GAP_Y),
          alive: true,
        });
      }
    }
    const total = invaders.length;

    // Destructible bunkers, rebuilt whole each wave.
    const shieldBlockW = SHIELD_COLS * SHIELD_CELL;
    const shieldY = canvas.height - PLAYER_BOTTOM_GAP - 90;
    const shieldCells: ShieldCell[] = [];
    for (let s = 0; s < SHIELD_COUNT; s += 1) {
      // Evenly spaced across the field, each block centered in its slot.
      const slot = (canvas.width - 2 * EDGE_MARGIN) / SHIELD_COUNT;
      const blockX = EDGE_MARGIN + slot * s + (slot - shieldBlockW) / 2;
      for (let cy = 0; cy < SHIELD_ROWS; cy += 1) {
        for (let cx = 0; cx < SHIELD_COLS; cx += 1) {
          shieldCells.push({
            x: blockX + cx * SHIELD_CELL,
            y: shieldY + cy * SHIELD_CELL,
            alive: true,
          });
        }
      }
    }

    const player = {
      x: canvas.width / 2 - PLAYER_W / 2,
      get y() {
        return canvas.height - PLAYER_BOTTOM_GAP;
      },
    };

    // Player shots now live in an array to support spread fans and rapid fire.
    // The default feel is preserved: with no powerup active, only one shot is
    // allowed in flight at a time (see the fire gate in `update`).
    const playerBullets: Bullet[] = [];
    const invaderBullets: Bullet[] = [];
    const powerups: Powerup[] = [];
    let direction = 1;
    let invincibleUntil = 0;
    // Active powerup expiries (performance.now() timestamps; 0 = inactive).
    let rapidUntil = 0;
    let spreadUntil = 0;
    let lastShot = 0;
    let nextInvaderFire = performance.now() + fireMin + Math.random() * (fireMax - fireMin);
    let gameOver = false;

    let raf = 0;
    let last = performance.now();

    const damageShields = (bx: number, by: number, bw: number, bh: number) => {
      for (const cell of shieldCells) {
        if (cell.alive && hit(bx, by, bw, bh, cell.x, cell.y, SHIELD_CELL, SHIELD_CELL)) {
          cell.alive = false;
          return true;
        }
      }
      return false;
    };

    const update = (now: number, dt: number) => {
      const alive = invaders.filter((i) => i.alive);
      if (alive.length === 0) {
        gameOver = true;
        useGame.getState().winWave();
        return;
      }

      // Player movement.
      if (keys.current.left) player.x -= PLAYER_SPEED * dt;
      if (keys.current.right) player.x += PLAYER_SPEED * dt;
      player.x = Math.max(EDGE_MARGIN, Math.min(canvas.width - EDGE_MARGIN - PLAYER_W, player.x));

      // Fire. Default rule is one shot in flight at a time; Rapid Fire swaps
      // that for a short cooldown so you can stream bullets. Spread Shot turns
      // each shot into a narrow three-bullet fan.
      const rapid = now < rapidUntil;
      const spread = now < spreadUntil;
      const canFire = rapid ? now - lastShot >= RAPID_COOLDOWN_MS : playerBullets.length === 0;
      if (keys.current.fire && canFire) {
        lastShot = now;
        const bx = player.x + PLAYER_W / 2 - BULLET_W / 2;
        const by = player.y - BULLET_H;
        playerBullets.push({ x: bx, y: by });
        if (spread) {
          playerBullets.push({ x: bx, y: by, vx: -SPREAD_SPEED_X });
          playerBullets.push({ x: bx, y: by, vx: SPREAD_SPEED_X });
        }
      }

      // Invader group movement, faster as the swarm thins and as waves climb.
      const speed = baseSpeed * (1 + ((total - alive.length) / total) * SPEEDUP_FACTOR);
      const dx = speed * dt * direction;
      let hitEdge = false;
      for (const inv of alive) {
        const nx = inv.x + dx;
        if (nx < EDGE_MARGIN || nx + INVADER_W > canvas.width - EDGE_MARGIN) {
          hitEdge = true;
          break;
        }
      }
      if (hitEdge) {
        direction *= -1;
        for (const inv of invaders) inv.y += STEP_DOWN;
      } else {
        for (const inv of invaders) inv.x += dx;
      }

      // Invaders erode any bunker cells they overrun, and reaching the player's
      // line ends the game.
      for (const inv of alive) {
        for (const cell of shieldCells) {
          if (cell.alive && hit(inv.x, inv.y, INVADER_W, INVADER_H, cell.x, cell.y, SHIELD_CELL, SHIELD_CELL)) {
            cell.alive = false;
          }
        }
        if (inv.y + INVADER_H >= player.y) {
          gameOver = true;
          useGame.setState({ phase: 'lost' });
          return;
        }
      }

      // A random live invader fires on the wave's cadence; higher waves can
      // loose a second shot from another invader.
      if (now >= nextInvaderFire) {
        const shooter = alive[Math.floor(Math.random() * alive.length)];
        invaderBullets.push({ x: shooter.x + INVADER_W / 2 - BULLET_W / 2, y: shooter.y + INVADER_H });
        if (doubleShot && Math.random() < 0.35) {
          const second = alive[Math.floor(Math.random() * alive.length)];
          invaderBullets.push({ x: second.x + INVADER_W / 2 - BULLET_W / 2, y: second.y + INVADER_H });
        }
        nextInvaderFire = now + fireMin + Math.random() * (fireMax - fireMin);
      }

      // Move player bullets, resolve bunker then invader hits. Each bullet may
      // carry horizontal velocity (spread fan).
      for (let i = playerBullets.length - 1; i >= 0; i -= 1) {
        const b = playerBullets[i];
        b.y -= PLAYER_BULLET_SPEED * dt;
        if (b.vx) b.x += b.vx * dt;
        if (b.y + BULLET_H < 0 || b.x + BULLET_W < 0 || b.x > canvas.width) {
          playerBullets.splice(i, 1);
          continue;
        }
        if (damageShields(b.x, b.y, BULLET_W, BULLET_H)) {
          playerBullets.splice(i, 1);
          continue;
        }
        for (const inv of invaders) {
          if (inv.alive && hit(b.x, b.y, BULLET_W, BULLET_H, inv.x, inv.y, INVADER_W, INVADER_H)) {
            inv.alive = false;
            playerBullets.splice(i, 1);
            useGame.getState().addScore(10);
            // Chance to drop a falling powerup from the wreck.
            if (Math.random() < POWERUP_DROP_CHANCE) {
              powerups.push({
                x: inv.x + INVADER_W / 2 - POWERUP_SIZE / 2,
                y: inv.y + INVADER_H / 2,
                type: POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)],
              });
            }
            break;
          }
        }
      }

      // Falling powerups: drift down, collect on contact with the player.
      for (let i = powerups.length - 1; i >= 0; i -= 1) {
        const p = powerups[i];
        p.y += POWERUP_FALL_SPEED * dt;
        if (p.y > canvas.height) {
          powerups.splice(i, 1);
          continue;
        }
        if (hit(p.x, p.y, POWERUP_SIZE, POWERUP_SIZE, player.x, player.y, PLAYER_W, PLAYER_H)) {
          powerups.splice(i, 1);
          if (p.type === 'rapid') {
            rapidUntil = now + RAPID_MS;
          } else if (p.type === 'spread') {
            spreadUntil = now + SPREAD_MS;
          } else {
            // Shield: revive some dead bunker cells and grant a grace window.
            let rebuilt = 0;
            for (const cell of shieldCells) {
              if (rebuilt >= SHIELD_REBUILD) break;
              if (!cell.alive) {
                cell.alive = true;
                rebuilt += 1;
              }
            }
            invincibleUntil = Math.max(invincibleUntil, now + SHIELD_INVINCIBLE_MS);
          }
        }
      }

      // Move invader bullets, resolve bunker then player hits.
      for (let i = invaderBullets.length - 1; i >= 0; i -= 1) {
        const b = invaderBullets[i];
        b.y += INVADER_BULLET_SPEED * dt;
        if (b.y > canvas.height) {
          invaderBullets.splice(i, 1);
          continue;
        }
        if (damageShields(b.x, b.y, BULLET_W, BULLET_H)) {
          invaderBullets.splice(i, 1);
          continue;
        }
        if (hit(b.x, b.y, BULLET_W, BULLET_H, player.x, player.y, PLAYER_W, PLAYER_H)) {
          invaderBullets.splice(i, 1);
          if (now >= invincibleUntil) {
            invincibleUntil = now + INVINCIBLE_MS;
            useGame.getState().loseLife();
            if (useGame.getState().phase === 'lost') {
              gameOver = true;
              return;
            }
          }
        }
      }
    };

    const draw = (now: number) => {
      ctx.fillStyle = COLORS.void;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Invaders: simple pixel bodies with little legs.
      ctx.fillStyle = COLORS.invader;
      for (const inv of invaders) {
        if (!inv.alive) continue;
        ctx.fillRect(inv.x, inv.y + 4, INVADER_W, INVADER_H - 8);
        ctx.fillRect(inv.x + 4, inv.y, INVADER_W - 8, INVADER_H);
        ctx.fillRect(inv.x + 2, inv.y + INVADER_H - 4, 5, 4);
        ctx.fillRect(inv.x + INVADER_W - 7, inv.y + INVADER_H - 4, 5, 4);
      }

      // Bunkers.
      ctx.fillStyle = COLORS.shield;
      for (const cell of shieldCells) {
        if (cell.alive) ctx.fillRect(cell.x, cell.y, SHIELD_CELL, SHIELD_CELL);
      }

      // Falling powerups: each type a distinct colour and shape.
      for (const p of powerups) {
        ctx.fillStyle = POWERUP_COLORS[p.type];
        if (p.type === 'rapid') {
          // Stacked bars — a "burst".
          ctx.fillRect(p.x, p.y, POWERUP_SIZE, 4);
          ctx.fillRect(p.x, p.y + 6, POWERUP_SIZE, 4);
          ctx.fillRect(p.x, p.y + 12, POWERUP_SIZE, 4);
        } else if (p.type === 'spread') {
          // Three dots fanning out.
          ctx.fillRect(p.x + POWERUP_SIZE / 2 - 2, p.y, 4, 4);
          ctx.fillRect(p.x, p.y + POWERUP_SIZE - 5, 4, 5);
          ctx.fillRect(p.x + POWERUP_SIZE - 4, p.y + POWERUP_SIZE - 5, 4, 5);
          ctx.fillRect(p.x + POWERUP_SIZE / 2 - 2, p.y + POWERUP_SIZE - 5, 4, 5);
        } else {
          // Shield dome.
          ctx.beginPath();
          ctx.arc(p.x + POWERUP_SIZE / 2, p.y + POWERUP_SIZE - 2, POWERUP_SIZE / 2, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Player ship — cosmetic silhouette and colour — blinking while invincible.
      const blink = now < invincibleUntil && Math.floor(now / 100) % 2 === 0;
      if (!blink) {
        drawShip(ctx, cosmetic.shape, player.x, player.y, PLAYER_W, PLAYER_H, cosmetic.color);
      }

      // Bullets. Player shots take the cosmetic's bullet colour.
      ctx.fillStyle = cosmetic.bulletColor;
      for (const b of playerBullets) {
        ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
      }
      ctx.fillStyle = COLORS.invaderBullet;
      for (const b of invaderBullets) {
        ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
      }

      // Active-effect readout, bottom-left, so the player sees what is running.
      const active: Array<[string, string, number]> = [];
      if (now < rapidUntil) active.push(['RAPID', POWERUP_COLORS.rapid, rapidUntil - now]);
      if (now < spreadUntil) active.push(['SPREAD', POWERUP_COLORS.spread, spreadUntil - now]);
      if (active.length > 0) {
        ctx.font = '600 11px ui-monospace, monospace';
        ctx.textBaseline = 'bottom';
        active.forEach(([label, color, remaining], idx) => {
          ctx.fillStyle = color;
          ctx.fillText(
            `${label} ${(remaining / 1000).toFixed(1)}s`,
            10,
            canvas.height - 10 - idx * 15,
          );
        });
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(now, dt);
      if (gameOver) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [gameActive, phase, wave]);

  if (!gameActive) return null;

  // Discrete status for assistive tech: changes once per wave and on game over,
  // rather than chattering on every point scored.
  const liveMessage =
    phase === 'cleared'
      ? `Wave ${wave} cleared. Next wave incoming.`
      : phase === 'lost'
        ? `Game over. Final score ${score}.`
        : `Wave ${wave}.`;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      {/* Dimmer: blocks interaction with the page behind without fully hiding it. */}
      <div className="absolute inset-0 bg-black/70" aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Arcade Terminal — Space Invaders"
        tabIndex={-1}
        className="panel-solid animate-cosmos-rise relative flex w-[min(820px,92vw,calc((92vh-3.5rem)*4/3))] flex-col overflow-hidden rounded-2xl focus:outline-none"
      >
        <header className="flex items-center gap-4 border-b border-white/10 px-4 py-2.5">
          <p className="hud-label shrink-0">Arcade Terminal</p>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-x-4 gap-y-1 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-slate-300">
            <span>
              Wave <span className="text-plasma">{wave}</span>
            </span>
            <span>
              Score <span className="text-nova">{score}</span>
            </span>
            <span>
              Hi <span className="text-solar">{highScore}</span>
            </span>
            <span>
              Lives <span className="text-relay">{lives}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={exit}
            aria-label="Exit game"
            className="panel-hover inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-300 hover:text-nova"
          >
            <BsX className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div ref={arenaRef} className="relative aspect-[4/3] w-full" style={{ backgroundColor: COLORS.void }}>
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {(phase === 'cleared' || phase === 'lost') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-4">
              <div className="panel-solid flex flex-col items-center gap-4 rounded-2xl px-8 py-7 text-center">
                <p className="font-mono text-sm uppercase tracking-[0.2em] text-slate-400">
                  {phase === 'cleared' ? `Wave ${wave} cleared` : 'Game over'}
                </p>
                <p
                  className={`font-mono text-2xl uppercase tracking-[0.12em] ${
                    phase === 'cleared' ? 'text-nova' : 'text-relay'
                  }`}
                >
                  {phase === 'cleared' ? `Wave ${wave + 1} incoming` : 'Ship lost'}
                </p>
                <p className="text-sm text-slate-300">
                  {phase === 'cleared' ? 'Score' : 'Final score'}{' '}
                  <span className="text-solar">{score}</span>
                  <span className="text-slate-500"> · Best {highScore}</span>
                </p>
                {phase === 'cleared' ? (
                  <button
                    type="button"
                    onClick={() => useGame.getState().nextWave()}
                    className="panel-hover mt-1 inline-flex h-10 items-center rounded-full px-5 font-mono text-xs uppercase tracking-[0.16em] text-slate-200 hover:text-nova"
                  >
                    Continue
                  </button>
                ) : (
                  <>
                    {submitState === 'done' ? (
                      <p className="font-mono text-xs uppercase tracking-[0.16em] text-nova">
                        Score transmitted
                      </p>
                    ) : (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          void submitScore();
                        }}
                        className="flex w-full max-w-[18rem] flex-col gap-2"
                      >
                        <label htmlFor="leaderboard-name" className="sr-only">
                          Leaderboard name
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="leaderboard-name"
                            type="text"
                            value={submitName}
                            maxLength={9}
                            onChange={(event) => setSubmitName(event.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="Your handle"
                            disabled={submitState === 'sending'}
                            className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-200 placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-600 focus:border-nova/50 focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={submitState === 'sending'}
                            className="panel-hover shrink-0 rounded-full border border-white/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-slate-200 hover:text-nova disabled:opacity-60"
                          >
                            {submitState === 'sending' ? '…' : 'Submit'}
                          </button>
                        </div>
                        <p
                          aria-live="polite"
                          className={`min-h-[1rem] text-[0.625rem] ${
                            submitState === 'error' ? 'text-relay' : 'text-slate-500'
                          }`}
                        >
                          {submitState === 'error'
                            ? 'Could not submit. Try again or skip.'
                            : 'Optional — add your run to the leaderboard.'}
                        </p>
                      </form>
                    )}
                    <button
                      type="button"
                      onClick={playAgain}
                      className="panel-hover mt-1 inline-flex h-10 items-center rounded-full px-5 font-mono text-xs uppercase tracking-[0.16em] text-slate-200 hover:text-nova"
                    >
                      Play Again
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {liveMessage}
      </p>
    </div>
  );
}
