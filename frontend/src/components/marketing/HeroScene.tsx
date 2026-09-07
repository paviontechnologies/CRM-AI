'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * The hero's background field.
 *
 * A slowly turning wireframe solid with a shell of points around it. It is
 * deliberately abstract and low-contrast: the job is to give the fold depth and
 * motion, not to compete with the headline sitting on top of it.
 *
 * Everything is client-only and mounted after paint (see HeroSceneLazy) so the
 * three.js bundle never blocks the text people actually came to read.
 */

function readAccent(): string {
  if (typeof window === 'undefined') return '#0b7052';
  const v = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
  return v || '#0b7052';
}

function Solid({ color }: { color: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!mesh.current || !inner.current) return;
    // Two rates, deliberately not multiples of each other, so the silhouette
    // never appears to repeat.
    mesh.current.rotation.y += delta * 0.09;
    mesh.current.rotation.x += delta * 0.035;
    inner.current.rotation.y -= delta * 0.06;
    inner.current.rotation.z += delta * 0.028;

    // A long, shallow breath in scale keeps it alive without drawing the eye.
    const t = state.clock.elapsedTime;
    const s = 1 + Math.sin(t * 0.35) * 0.04;
    mesh.current.scale.setScalar(s);
  });

  return (
    <group>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[2.15, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.55} />
      </mesh>
      <mesh ref={inner}>
        <icosahedronGeometry args={[1.35, 0]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.32} />
      </mesh>
    </group>
  );
}

function Dust({ color }: { color: string }) {
  const points = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const count = 320;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Spherical shell, not a cube: a box of points reads as a grid from some
      // angles, a shell always reads as volume.
      const r = 3.2 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color={color} size={0.045} transparent opacity={0.75} sizeAttenuation />
    </points>
  );
}

/** Eases the whole group toward the pointer — depth you feel rather than see. */
function Parallax({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  useFrame((state) => {
    if (!group.current) return;
    const x = (state.pointer.x * viewport.width) / 90;
    const y = (state.pointer.y * viewport.height) / 90;
    group.current.rotation.y += (x - group.current.rotation.y) * 0.03;
    group.current.rotation.x += (-y - group.current.rotation.x) * 0.03;
  });

  return <group ref={group}>{children}</group>;
}

export default function HeroScene() {
  const [color, setColor] = useState(readAccent);

  // The accent flips with the theme, and the scene has to follow it.
  useEffect(() => {
    const update = () => setColor(readAccent());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', update);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
    };
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 45 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <Parallax>
        <Solid color={color} />
        <Dust color={color} />
      </Parallax>
    </Canvas>
  );
}
