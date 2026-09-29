'use client';

import { useMemo } from 'react';
import { AdditiveBlending, Color, FrontSide } from 'three';

const VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    // Fresnel: transparent where the surface faces the camera, bright at the
    // silhouette — which reads as an atmospheric rim once blended additively.
    float fresnel = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), uPower);
    gl_FragColor = vec4(uColor, fresnel * uIntensity);
  }
`;

interface AtmosphereProps {
  /** Radius of the body this wraps. The shell is drawn slightly larger. */
  radius: number;
  color: string;
  /** Higher values tighten the rim toward the silhouette. */
  power?: number;
  intensity?: number;
  scale?: number;
}

/** A translucent shell around a planet that fakes an atmospheric limb. */
export default function Atmosphere({
  radius,
  color,
  power = 2.6,
  intensity = 1.0,
  scale = 1.18,
}: AtmosphereProps) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uPower: { value: power },
      uIntensity: { value: intensity },
    }),
    [color, power, intensity],
  );

  return (
    <mesh scale={scale}>
      <sphereGeometry args={[radius, 32, 32]} />
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        // Additive + no depth writes so the shell brightens whatever is
        // behind it instead of punching a hole in the depth buffer.
        blending={AdditiveBlending}
        depthWrite={false}
        side={FrontSide}
      />
    </mesh>
  );
}
