"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
};

export function FireworksOverlay() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const spawn = () => {
      const cx = Math.random() * canvas.width;
      const cy = (Math.random() * 0.4 + 0.2) * canvas.height;
      const count = 120;
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count;
        const speed = 1 + Math.random() * 4;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 0,
          ttl: 60 + Math.random() * 40,
          size: 1 + Math.random() * 2
        });
      }
    };

    spawn();
    const spawner = setInterval(spawn, 900);

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;

        p.vy += 0.03; // gravity
        p.x += p.vx;
        p.y += p.vy;

        const alpha = Math.max(0, 1 - p.life / p.ttl);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();

        if (p.life >= p.ttl) particles.splice(i, 1);
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(spawner);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <canvas ref={ref} className="w-full h-full" />
    </div>
  );
}
