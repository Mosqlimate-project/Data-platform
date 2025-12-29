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

    const BASE_POINTS = 250;
    const MAX_DISTANCE = 120;
    const MOUSE_DISTANCE = 140;
    const POINT_SPEED = 0.35;
    const POINT_RADIUS = 2;

    const setSize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = document.documentElement.scrollHeight;

      sizeRef.current = { w, h, dpr };

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setSize();

    //create points
    pointsRef.current = Array.from({ length: BASE_POINTS }).map(() => ({
      x: Math.random() * sizeRef.current.w,
      y: Math.random() * sizeRef.current.h,
      vx: (Math.random() - 0.5) * POINT_SPEED,
      vy: (Math.random() - 0.5) * POINT_SPEED,
      r: POINT_RADIUS
    }));

    let running = true;

    //detects the current theme (light or dark)
    const isDarkMode = () => {
      return document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    };

    const animate = () => {
      if (!running) return;

      const { w, h } = sizeRef.current;
      const { x: mx, y: my, active } = mouseRef.current;
      const dark = isDarkMode();

      ctx.clearRect(0, 0, w, h);

      //move points
      for (const p of pointsRef.current) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x <= 0 || p.x >= w) p.vx *= -1;
        if (p.y <= 0 || p.y >= h) p.vy *= -1;
      }

      //draw points
      for (const p of pointsRef.current) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? "rgba(89, 102, 175,0.55)"
          : "rgba(189, 226, 208, 0.85)";
        ctx.fill();
      }

      //lines between points
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
            const alpha = 1 - dist / MAX_DISTANCE;
            ctx.strokeStyle = dark
              ? `rgba(89, 102, 175,${alpha})`
              : `rgba(189, 226, 208, ${alpha})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }

      //mouse interaction
      if (active) {
        for (const p of pts) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MOUSE_DISTANCE) {
            const alpha = 1 - dist / MOUSE_DISTANCE;

            //line to mouse
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mx, my);
            ctx.strokeStyle = dark
              ? `rgba(89, 102, 175,${alpha})`
              : `rgba(189, 226, 208, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();

            //slight attraction
            p.vx += -dx * 0.0003;
            p.vy += -dy * 0.0003;
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    //Mouse events (related to the canvas)
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

    //resize
    const onResize = () => setSize();
    window.addEventListener("resize", onResize);

    //cleanup
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
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ zIndex: 0 }}
    />
  );
}
