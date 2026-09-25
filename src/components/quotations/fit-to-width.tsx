"use client";

import { useEffect, useRef, useState } from "react";

/** Scales fixed-width content (the A4 document) down to fit its container. */
export function FitToWidth({ width, children }: { width: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setZoom(Math.min(1, el.clientWidth / width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={ref} className="w-full overflow-hidden">
      <div style={{ zoom }}>{children}</div>
    </div>
  );
}
