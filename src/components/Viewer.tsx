"use client";

import { useEffect, useRef, useState } from "react";
import { hazardLabel, type AtlasItem } from "@/lib/atlas";
import Icon from "./Icon";
import styles from "./Atlas.module.css";

type Props = {
  items: AtlasItem[];
  index: number;
  aimags: Record<string, string>;
  onIndex: (index: number) => void;
  onClose: () => void;
};

const MIN = 1;
const MAX = 8;

/** Full-screen map viewer: wheel / buttons zoom, drag pans, arrows page. */
export default function Viewer({ items, index, aimags, onIndex, onClose }: Props) {
  const item = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) onIndex(index - 1);
      else if (e.key === "ArrowRight" && hasNext) onIndex(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext, onIndex, onClose]);

  const meta = [
    item.scope === "MN" ? "Улсын хэмжээ" : (aimags[item.scope] ?? item.scope),
    item.hazard && !item.title.includes(hazardLabel(item.hazard))
      ? hazardLabel(item.hazard)
      : null,
    item.unit,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={styles.viewer} role="dialog" aria-modal="true" aria-label={item.title}>
      <header className={styles.viewerHead}>
        <div>
          <strong>{item.title}</strong>
          <span>{meta}</span>
        </div>
        <span className={styles.viewerCount}>
          {index + 1} / {items.length}
        </span>
        <a
          className={styles.viewerButton}
          href={item.img}
          download={item.file}
          title="Татах"
          aria-label="Татах"
        >
          <Icon name="download" size={17} />
        </a>
        <button
          type="button"
          className={styles.viewerButton}
          onClick={onClose}
          title="Хаах (Esc)"
          aria-label="Хаах"
          autoFocus
        >
          <Icon name="close" size={18} />
        </button>
      </header>
      <ZoomImage key={item.id} item={item} />
      {hasPrev && (
        <button
          type="button"
          className={`${styles.viewerNav} ${styles.viewerPrev}`}
          onClick={() => onIndex(index - 1)}
          aria-label="Өмнөх"
          title="Өмнөх (←)"
        >
          <Icon name="chevron" size={22} />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          className={`${styles.viewerNav} ${styles.viewerNext}`}
          onClick={() => onIndex(index + 1)}
          aria-label="Дараах"
          title="Дараах (→)"
        >
          <Icon name="chevron" size={22} />
        </button>
      )}
    </div>
  );
}

function ZoomImage({ item }: { item: AtlasItem }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);

  /** Zoom by `factor` around a point of the stage (default: its centre). */
  const zoom = (factor: number, px?: number, py?: number) => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return;
    const cx = px ?? box.width / 2;
    const cy = py ?? box.height / 2;
    setView((v) => {
      const s = Math.min(MAX, Math.max(MIN, v.s * factor));
      if (s === MIN) return { s, x: 0, y: 0 };
      const k = s / v.s;
      return { s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  };

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      data-zoomed={view.s > 1 || undefined}
      onWheel={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        zoom(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - box.left, e.clientY - box.top);
      }}
      onDoubleClick={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        if (view.s > 1) setView({ s: 1, x: 0, y: 0 });
        else zoom(2.5, e.clientX - box.left, e.clientY - box.top);
      }}
      onPointerDown={(e) => {
        if (view.s <= 1) return;
        drag.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        drag.current = { x: e.clientX, y: e.clientY };
        setView((v) => ({ ...v, x: v.x + e.clientX - d.x, y: v.y + e.clientY - d.y }));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
    >
      <div
        className={styles.stageInner}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}
      >
        {/* Thumbnail first, the full image fades in over it once loaded. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.thumb} alt="" className={styles.stageThumb} draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.img}
          alt={item.title}
          className={styles.stageImg}
          data-loaded={loaded || undefined}
          onLoad={() => setLoaded(true)}
          draggable={false}
        />
      </div>
      <div className={styles.zoomBar} onDoubleClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => zoom(1.5)} aria-label="Томруулах" title="Томруулах">
          <Icon name="plus" size={16} />
        </button>
        <button type="button" onClick={() => zoom(1 / 1.5)} aria-label="Жижигрүүлэх" title="Жижигрүүлэх">
          <Icon name="minus" size={16} />
        </button>
        <button
          type="button"
          onClick={() => setView({ s: 1, x: 0, y: 0 })}
          aria-label="Бүтнээр харах"
          title="Бүтнээр харах"
        >
          <Icon name="focus" size={16} />
        </button>
        <span>{Math.round(view.s * 100)}%</span>
      </div>
      {!loaded && <span className={styles.stageSpinner} aria-hidden="true" />}
    </div>
  );
}
