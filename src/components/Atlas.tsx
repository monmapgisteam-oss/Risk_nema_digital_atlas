"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MODES,
  compareItems,
  hazardLabel,
  matchesMode,
  matchesSearch,
  type AtlasItem,
  type Manifest,
  type Mode,
} from "@/lib/atlas";
import {
  deleteLocalMap,
  listLocalMaps,
  toAtlasItem,
  type LocalMapRecord,
} from "@/lib/localMaps";
import Icon from "./Icon";
import PanelResizer from "./PanelResizer";
import AtlasPanel from "./AtlasPanel";
import Gallery from "./Gallery";
import Viewer from "./Viewer";
import UploadDialog from "./UploadDialog";
import dash from "./Dashboard.module.css";
import styles from "./Atlas.module.css";

export type AtlasFilters = {
  mode: Mode;
  /** Element topic (vulnerability / exposure views). */
  topic: string;
  /** "all" or a hazard id. */
  hazard: string;
  /** "MN" national or "aimag" (every aimag). */
  scope: string;
};

type LocalEntry = { rec: LocalMapRecord; item: AtlasItem };

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
  /** Maps added from this computer, with object URLs of their files. */
  const [local, setLocal] = useState<LocalEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  /** Header search by map name; empty = use the filters. */
  const [query, setQuery] = useState("");
  const urls = useRef(new Map<string, string>());

  const toEntry = useCallback((rec: LocalMapRecord): LocalEntry => {
    const url = URL.createObjectURL(rec.blob);
    urls.current.set(rec.id, url);
    return { rec, item: toAtlasItem(rec, url) };
  }, []);

  /** Shows maps just saved by the upload dialog, in the view they belong to. */
  const addLocal = useCallback(
    (recs: LocalMapRecord[]) => {
      setLocal((cur) => [...cur, ...recs.map(toEntry)]);
      const r = recs[recs.length - 1];
      setOpen(null);
      setFilters({
        mode: r.kind === "expvul" ? "exp" : r.kind,
        topic: r.kind === "hz" ? "" : r.topic,
        hazard: r.hazard ?? "all",
        scope: r.scope === "MN" ? "MN" : "aimag",
      });
    },
    [toEntry],
  );

  const removeLocal = useCallback(async (id: string) => {
    try {
      await deleteLocalMap(id);
    } catch {
      return;
    }
    const url = urls.current.get(id);
    if (url) URL.revokeObjectURL(url);
    urls.current.delete(id);
    setOpen(null);
    setLocal((cur) => cur.filter((l) => l.rec.id !== id));
  }, []);

  useEffect(() => {
    let live = true;
    listLocalMaps().then((recs) => live && setLocal(recs.map(toEntry)));
    const map = urls.current;
    return () => {
      live = false;
      map.forEach((url) => URL.revokeObjectURL(url));
      map.clear();
    };
  }, [toEntry]);

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
      [...(manifest?.items ?? []), ...local.map((l) => l.item)].filter(
        (i) =>
          i.topic === topic &&
          matchesMode(i.kind, filters.mode) &&
          // Mongolian map where there is one, otherwise the English one.
          i.mn,
      ),
    [manifest, local, topic, filters.mode],
  );
  const searching = query.trim() !== "";
  const items = useMemo(
    () =>
      // A search looks through the whole atlas, not only the chosen view.
      (searching
        ? [...(manifest?.items ?? []), ...local.map((l) => l.item)].filter(
            (i) => i.mn && matchesSearch(i, query),
          )
        : base.filter(
            (i) =>
              (filters.hazard === "all" || i.hazard === filters.hazard) &&
              (filters.scope === "aimag" ? i.scope !== "MN" : i.scope === "MN"),
          )
      ).sort(compareItems),
    [searching, query, manifest, local, base, filters.hazard, filters.scope],
  );

  const update = (patch: Partial<AtlasFilters>) => {
    setOpen(null);
    setQuery("");
    setFilters((cur) => ({ ...cur, ...patch }));
  };
  const reset = () => {
    setOpen(null);
    setQuery("");
    setFilters(START);
  };

  const topicName =
    manifest?.topics.find((t) => t.id === topic)?.name ??
    MODES.find((m) => m.id === filters.mode)?.label ??
    "";
  const scopeName =
    filters.scope === "aimag" ? "Аймгийн хэмжээнд" : "Улсын хэмжээнд";

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
        <label className={`${dash.locationField} ${styles.searchField}`}>
          <span>
            <Icon name="search" size={14} />
            Зургийн нэрээр хайх
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setOpen(null);
              setQuery(e.target.value);
            }}
            placeholder="Жишээ: H08a, Communities, Дорнод"
          />
        </label>
        <label className={`${dash.locationField} ${styles.scopeField}`}>
          <span>
            <Icon name="pin" size={14} />
            Хамрах хүрээ
          </span>
          <select
            value={filters.scope}
            onChange={(e) => update({ scope: e.target.value })}
          >
            <option value="MN">Улсын хэмжээнд</option>
            <option value="aimag">Аймгийн хэмжээнд</option>
          </select>
        </label>
        <button
          type="button"
          className={dash.headerReset}
          onClick={() => setUploading(true)}
          disabled={!manifest}
          title="Компьютерээс газрын зураг нэмэх"
        >
          <Icon name="upload" size={15} />
          Зураг оруулах
        </button>
        <button
          type="button"
          className={dash.headerReset}
          onClick={reset}
          aria-label="Бүх шүүлтүүрийг цэвэрлэх"
          title="Бүх шүүлтүүрийг цэвэрлэх"
        >
          <Icon name="reset" size={15} />
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
            searching
              ? `Хайлт: “${query.trim()}” · бүх атлас`
              : filters.mode === "hz"
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
          onDelete={removeLocal}
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
              ? `${manifest.items.length + local.length} газрын зураг` +
                (local.length ? ` (${local.length} нь таны оруулсан)` : "")
              : "Ачаалж байна…"}
        </span>
        <span>
          Эх сурвалж: ОБЕГ <span className={dash.footerDivider}>/</span> ICEM ·
          PwC · ENVIRON
        </span>
      </footer>
      {uploading && manifest && (
        <UploadDialog
          topics={manifest.topics}
          aimags={manifest.aimags}
          initial={{ ...filters, topic }}
          onDone={addLocal}
          onClose={() => setUploading(false)}
        />
      )}
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
