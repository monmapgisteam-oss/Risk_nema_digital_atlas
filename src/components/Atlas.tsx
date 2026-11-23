"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  MODES,
  compareItems,
  hazardLabel,
  matchesMode,
  type Manifest,
  type Mode,
} from "@/lib/atlas";
import Icon from "./Icon";
import PanelResizer from "./PanelResizer";
import AtlasPanel from "./AtlasPanel";
import Gallery from "./Gallery";
import Viewer from "./Viewer";
import dash from "./Dashboard.module.css";
import styles from "./Atlas.module.css";

export type AtlasFilters = {
  mode: Mode;
  /** Element topic (vulnerability / exposure views). */
  topic: string;
  /** "all" or a hazard id. */
  hazard: string;
  /** "MN" national, "all" every aimag, or one aimag key. */
  scope: string;
};

const START: AtlasFilters = {
  mode: "hz",
  topic: "",
  hazard: "all",
  scope: "MN",
};

export default function Atlas() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<AtlasFilters>(START);
  const [open, setOpen] = useState<number | null>(null);
  const [leftW, setLeftW] = useState<number | null>(null);
  const [headerSlot] = useState(() => document.getElementById("header-slot"));

  useEffect(() => {
    let live = true;
    fetch("/api/atlas")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((m: Manifest) => live && setManifest(m))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, []);

  const topics = useMemo(
    () =>
      (manifest?.topics ?? []).filter(
        (t) =>
          t.id !== "hazards" &&
          filters.mode !== "hz" &&
          t.kinds.some((k) => matchesMode(k as never, filters.mode)),
      ),
    [manifest, filters.mode],
  );
  // The chosen element, or the first one of the view.
  const topic =
    filters.mode === "hz"
      ? "hazards"
      : topics.some((t) => t.id === filters.topic)
        ? filters.topic
        : (topics[0]?.id ?? "");

  /** Maps of the view and element, before the hazard and place filters. */
  const base = useMemo(
    () =>
      (manifest?.items ?? []).filter(
        (i) =>
          i.topic === topic &&
          matchesMode(i.kind, filters.mode) &&
          // Mongolian map where there is one, otherwise the English one.
          i.mn,
      ),
    [manifest, topic, filters.mode],
  );
  const aimags = useMemo(() => {
    const keys = new Set(base.map((i) => i.scope).filter((s) => s !== "MN"));
    return Object.entries(manifest?.aimags ?? {})
      .filter(([k]) => keys.has(k))
      .sort((a, b) => a[1].localeCompare(b[1], "mn"));
  }, [base, manifest]);

  const items = useMemo(
    () =>
      base
        .filter(
          (i) =>
            (filters.hazard === "all" || i.hazard === filters.hazard) &&
            (filters.scope === "all" ||
              (filters.scope === "aimag"
                ? i.scope !== "MN"
                : i.scope === filters.scope)),
        )
        .sort(compareItems),
    [base, filters.hazard, filters.scope],
  );

  const update = (patch: Partial<AtlasFilters>) => {
    setOpen(null);
    setFilters((cur) => ({ ...cur, ...patch }));
  };
  const reset = () => {
    setOpen(null);
    setFilters(START);
  };

  const topicName =
    manifest?.topics.find((t) => t.id === topic)?.name ??
    MODES.find((m) => m.id === filters.mode)?.label ??
    "";
  const scopeName =
    filters.scope === "MN"
      ? "Улсын хэмжээ"
      : filters.scope === "all"
        ? "Улс ба аймгууд"
        : filters.scope === "aimag"
          ? "Бүх аймаг"
          : (manifest?.aimags[filters.scope] ?? filters.scope);

  const toolbar = (
    <header className={dash.toolbar}>
      <div className={dash.toolbarTitle}>
        <nav className={dash.crumbs} aria-label="Сонголт">
          <span>{MODES.find((m) => m.id === filters.mode)?.label}</span>
          {filters.mode !== "hz" && (
            <>
              <Icon name="chevron" size={13} />
              <span>{topicName}</span>
            </>
          )}
          <Icon name="chevron" size={13} />
          <span aria-current="page">
            {filters.hazard === "all"
              ? "Бүх аюул"
              : hazardLabel(filters.hazard)}
          </span>
        </nav>
      </div>
      <div className={`${dash.toolbarActions} ${styles.toolbarActions}`}>
        <label className={dash.locationField}>
          <span>
            <Icon name="pin" size={14} />
            Хамрах хүрээ
          </span>
          <select
            value={filters.scope}
            onChange={(e) => update({ scope: e.target.value })}
          >
            <option value="MN">Улсын хэмжээ</option>
            <option value="aimag">Бүх аймаг</option>
            <option value="all">Улс ба аймгууд</option>
            {aimags.length > 0 && (
              <optgroup label="Аймаг">
                {aimags.map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <button
          type="button"
          className={dash.headerReset}
          onClick={reset}
          aria-label="Бүх шүүлтүүрийг цэвэрлэх"
          title="Бүх шүүлтүүрийг цэвэрлэх"
        >
          <Icon name="reset" size={15} />
          Цэвэрлэх
        </button>
      </div>
    </header>
  );

  return (
    <div className={dash.workspace}>
      {headerSlot ? createPortal(toolbar, headerSlot) : toolbar}
      <div
        className={styles.layout}
        style={
          leftW
            ? ({ "--left-w": `${leftW}px` } as React.CSSProperties)
            : undefined
        }
      >
        <AtlasPanel
          filters={filters}
          update={update}
          topics={topics}
          topic={topic}
        />
        <PanelResizer
          side="left"
          label="Шүүлтүүрийн самбарын өргөн"
          min={220}
          max={520}
          onResize={setLeftW}
        />
        <Gallery
          items={items}
          aimags={manifest?.aimags ?? {}}
          heading={
            filters.mode === "hz"
              ? `Аюулын бүсчлэл · ${scopeName}`
              : `${topicName} · ${scopeName}`
          }
          status={
            error
              ? "Сервертэй холбогдож чадсангүй."
              : !manifest
                ? "Ачаалж байна…"
                : null
          }
          onOpen={setOpen}
        />
      </div>
      <footer className={dash.footer}>
        <span>
          <span
            className={
              error ? dash.errorDot : manifest ? dash.statusDot : dash.loadingDot
            }
          />
          {error
            ? "Атлас ачаалагдсангүй"
            : manifest
              ? `${manifest.items.length} газрын зураг`
              : "Ачаалж байна…"}
        </span>
        <span>
          Эх сурвалж: ОБЕГ <span className={dash.footerDivider}>/</span> ICEM ·
          PwC · ENVIRON
        </span>
      </footer>
      {open != null && items[open] && (
        <Viewer
          items={items}
          index={open}
          aimags={manifest?.aimags ?? {}}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
