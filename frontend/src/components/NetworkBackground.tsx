"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number; vx: number; vy: number; r: number };

export default function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const BASE_POINTS = 50;
    const MAX_DISTANCE = 120;
    const MOUSE_DISTANCE = 140;
    const POINT_SPEED = 0.35;
    const POINT_RADIUS = 2;

    const setSize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = canvas.clientWidth || canvas.offsetWidth || 300;
      const h = canvas.clientHeight || canvas.offsetHeight || 300;

      sizeRef.current = { w, h, dpr };

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setSize();

    // cria pontos
    pointsRef.current = Array.from({ length: BASE_POINTS }).map(() => ({
      x: Math.random() * sizeRef.current.w,
      y: Math.random() * sizeRef.current.h,
      vx: (Math.random() - 0.5) * POINT_SPEED,
      vy: (Math.random() - 0.5) * POINT_SPEED,
      r: POINT_RADIUS
    }));

    let running = true;

    const animate = () => {
      if (!running) return;

      const { w, h } = sizeRef.current;
      const { x: mx, y: my, active } = mouseRef.current;

      ctx.clearRect(0, 0, w, h);

      // move pontos
      for (const p of pointsRef.current) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x <= 0 || p.x >= w) p.vx *= -1;
        if (p.y <= 0 || p.y >= h) p.vy *= -1;
      }

      // desenha pontos
      for (const p of pointsRef.current) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(120,160,180,0.55)";
        ctx.fill();
      }

      // linhas entre pontos
      const pts = pointsRef.current;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAX_DISTANCE) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(120,160,180,${1 - dist / MAX_DISTANCE})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }

      // interação com o mouse
      if (active) {
        for (const p of pts) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MOUSE_DISTANCE) {
            const alpha = 1 - dist / MOUSE_DISTANCE;

            // linha até o mouse
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mx, my);
            ctx.strokeStyle = `rgba(160,200,220,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();

            // leve atração
            p.vx += -dx * 0.0003;
            p.vy += -dy * 0.0003;
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    // eventos do mouse (relativo ao canvas)
    const onMouseMove = (e: MouseEvent) => {
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();

      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    // resize
    const onResize = () => setSize();
    window.addEventListener("resize", onResize);

    // cleanup
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none" //none tira a interatividade mas as coisas funcionam
    />
  );
}
