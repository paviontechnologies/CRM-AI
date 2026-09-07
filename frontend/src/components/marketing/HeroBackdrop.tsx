'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });

/**
 * The hero's background.
 *
 * Three layers, cheapest first, so the fold looks finished at every stage of
 * loading: a masked grid, drifting colour fields, and — only when it is worth
 * it — a WebGL scene on top.
 *
 * This sits at `z-0` with the hero content at `z-10` rather than using a
 * negative z-index: a negative layer disappears behind the first ancestor that
 * paints a background, which is exactly what happened here the first time.
 */
export function HeroBackdrop() {
  const [show3d, setShow3d] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 1024) return;

    // three.js is decoration and by far the heaviest asset here, so it waits
    // until the browser has nothing more urgent to do.
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (idle) {
      const id = idle(() => setShow3d(true));
      return () => (window as Window & { cancelIdleCallback?: (h: number) => void })
        .cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setShow3d(true), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 grid-field opacity-70" />

      <div
        className="aurora aurora-a"
        style={{
          top: '-22%',
          left: '-10%',
          width: '46rem',
          height: '46rem',
          background: 'var(--color-accent)',
          opacity: 0.22,
        }}
      />
      <div
        className="aurora aurora-b"
        style={{
          top: '-30%',
          right: '-6%',
          width: '40rem',
          height: '40rem',
          background: 'var(--color-accent-alt)',
          opacity: 0.18,
        }}
      />
      <div
        className="aurora aurora-c"
        style={{
          bottom: '-34%',
          left: '28%',
          width: '38rem',
          height: '38rem',
          background: 'var(--color-accent)',
          opacity: 0.14,
        }}
      />

      {show3d && (
        <div className="absolute inset-y-[-18%] right-[-6%] w-[70%] animate-fade-in-up">
          <HeroScene />
        </div>
      )}

      {/* Fades the whole field into the section below rather than ending on a
          hard horizontal edge. */}
      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--color-canvas))' }}
      />
    </div>
  );
}
