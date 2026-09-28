import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';

/** Builds a soft radial-gradient sprite texture at runtime.
 *
 *  Generating this in a canvas rather than shipping a PNG keeps the repo and
 *  the Docker image free of binary art assets, and lets every glow take its
 *  colour from the section data instead of needing one file per hue. */
export function radialGradientTexture(color: string, softness = 0.45, size = 256): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, color);
    gradient.addColorStop(softness, `${color}55`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
