import { useEffect, useRef } from "react";
import type { MapData } from "../game/engine";
import { cn } from "../utils/cn";

export function WorldCanvas({
  data,
  className,
  size = 220,
  showMarkers = true,
  showPlayer = true,
  zoom = 1,
  frame = false,
}: {
  data: MapData | null;
  className?: string;
  size?: number;
  showMarkers?: boolean;
  showPlayer?: boolean;
  zoom?: number;
  frame?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#0b1a12";
    ctx.fillRect(0, 0, size, size);
    if (!data) return;

    const off = document.createElement("canvas");
    off.width = data.width;
    off.height = data.height;
    const octx = off.getContext("2d")!;
    const img = octx.createImageData(data.width, data.height);
    img.data.set(data.pixels);
    octx.putImageData(img, 0, 0);

    const viewCells = data.width / zoom;
    const cx = data.width / 2;
    const cy = data.height / 2;
    const sx = cx - viewCells / 2;
    const sy = cy - viewCells / 2;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, sx, sy, viewCells, viewCells, 0, 0, size, size);

    const toScreen = (x: number, z: number) => ({
      x: ((x - sx) / viewCells) * size,
      y: ((z - sy) / viewCells) * size,
    });

    if (showMarkers) {
      for (const wp of data.waypoints) {
        const p = toScreen(wp.x, wp.z);
        if (p.x < -10 || p.y < -10 || p.x > size + 10 || p.y > size + 10) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(4,12,8,.75)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = wp.color;
        ctx.fill();
        ctx.strokeStyle = "#ffffffaa";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    if (showPlayer) {
      const p = toScreen(data.player.x, data.player.z);
      ctx.save();
      ctx.translate(p.x, p.y);
      const forwardX = -Math.sin(data.player.yaw);
      const forwardZ = -Math.cos(data.player.yaw);
      ctx.rotate(Math.atan2(forwardZ, forwardX));
      // view cone
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
      grad.addColorStop(0, "rgba(255,236,178,.5)");
      grad.addColorStop(1, "rgba(255,236,178,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 28, -0.5, 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-4, 4.6);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, -4.6);
      ctx.closePath();
      ctx.fillStyle = "#fff6d8";
      ctx.fill();
      ctx.strokeStyle = "rgba(10,25,15,.9)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    if (frame) {
      ctx.strokeStyle = "rgba(232,246,214,.22)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
      const step = size / 6;
      ctx.strokeStyle = "rgba(232,246,214,.05)";
      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(i * step, 0);
        ctx.lineTo(i * step, size);
        ctx.moveTo(0, i * step);
        ctx.lineTo(size, i * step);
        ctx.stroke();
      }
    }
  }, [data, size, showMarkers, showPlayer, zoom, frame]);

  return (
    <canvas
      ref={ref}
      className={cn("map-pixelated block", className)}
      style={{ width: size, height: size }}
    />
  );
}
