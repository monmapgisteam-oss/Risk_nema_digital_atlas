"use client";

import { useRef } from "react";
import styles from "./Dashboard.module.css";

type Props = {
  /** Which panel this handle resizes; the right panel grows when dragged left. */
  side: "left" | "right";
  label: string;
  min: number;
  max: number;
  onResize: (width: number | null) => void;
};

/** Vertical drag handle between a side panel and the map. */
export default function PanelResizer({
  side,
  label,
  min,
  max,
  onResize,
}: Props) {
  const drag = useRef<{ x: number; w: number } | null>(null);

  const panelWidth = (el: HTMLElement) => {
    const panel =
      side === "left" ? el.previousElementSibling : el.nextElementSibling;
    return panel?.getBoundingClientRect().width ?? min;
  };
  const clamp = (w: number) => Math.round(Math.min(max, Math.max(min, w)));

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      className={styles.resizer}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, w: panelWidth(e.currentTarget) };
        document.body.classList.add(styles.resizing);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.x;
        onResize(clamp(drag.current.w + (side === "left" ? dx : -dx)));
      }}
      onPointerUp={(e) => {
        drag.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
        document.body.classList.remove(styles.resizing);
      }}
      onDoubleClick={() => onResize(null)}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const step =
          (e.key === "ArrowRight" ? 16 : -16) * (side === "left" ? 1 : -1);
        onResize(clamp(panelWidth(e.currentTarget) + step));
      }}
    />
  );
}
