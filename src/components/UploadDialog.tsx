"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  HAZARDS,
  MODES,
  hazardLabel,
  matchesMode,
  type AtlasTopic,
  type Mode,
} from "@/lib/atlas";
import {
  ACCEPT,
  addLocalMap,
  checkFile,
  type LocalMapMeta,
  type LocalMapRecord,
} from "@/lib/localMaps";
import { classify } from "@/lib/mapNames";
import type { AtlasFilters } from "./Atlas";
import Icon from "./Icon";
import dash from "./Dashboard.module.css";
import styles from "./Atlas.module.css";

type Props = {
  /** All topics of the manifest. */
  topics: AtlasTopic[];
  aimags: Record<string, string>;
  /** Current gallery filters, used as the manual choice. */
  initial: AtlasFilters;
  /** Called with the maps that were saved. */
  onDone: (recs: LocalMapRecord[]) => void;
  onClose: () => void;
};

const ZONING_HAZARDS = HAZARDS.filter((h) => h.id !== "mh");

const topicsFor = (topics: AtlasTopic[], mode: Mode) =>
  topics.filter(
    (t) =>
      t.id !== "hazards" &&
      mode !== "hz" &&
      t.kinds.some((k) => matchesMode(k as never, mode)),
  );

/** A zoning map needs one hazard; other views may be for all hazards. */
const hazardFor = (mode: Mode, hazard: string) =>
  mode === "hz" && !ZONING_HAZARDS.some((h) => h.id === hazard)
    ? ZONING_HAZARDS[0].id
    : hazard;

const KIND_LABEL: Record<LocalMapMeta["kind"], string> = {
  hz: "Аюул",
  vul: "Эмзэг байдал",
  exp: "Өртөх байдал",
  expvul: "Өртөх, эмзэг байдал",
};

export default function UploadDialog({
  topics,
  aimags,
  initial,
  onDone,
  onClose,
}: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [topic, setTopic] = useState(initial.topic);
  const [hazard, setHazard] = useState(hazardFor(initial.mode, initial.hazard));
  const [scope, setScope] = useState(
    initial.scope === "all" || initial.scope === "aimag" ? "MN" : initial.scope,
  );
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const modeTopics = useMemo(() => topicsFor(topics, mode), [topics, mode]);
  const topicId = modeTopics.some((t) => t.id === topic)
    ? topic
    : (modeTopics[0]?.id ?? "");
  const aimagList = useMemo(
    () => Object.entries(aimags).sort((a, b) => a[1].localeCompare(b[1], "mn")),
    [aimags],
  );

  /** The manual choice, used for files whose name isn't recognised. */
  const manual: LocalMapMeta = {
    title: "",
    kind: mode,
    topic: mode === "hz" ? "hazards" : topicId,
    hazard: hazard === "all" ? null : hazard,
    scope,
  };
  const detected = files.map((f) => classify(f.name, manual));
  const needsManual = detected.some((d) => !d.auto);

  const describe = (m: LocalMapMeta) =>
    [
      KIND_LABEL[m.kind],
      m.kind === "hz" ? null : topics.find((t) => t.id === m.topic)?.name,
      m.hazard ? hazardLabel(m.hazard) : "Бүх аюул",
      m.scope === "MN" ? "Улсын хэмжээ" : (aimags[m.scope] ?? m.scope),
    ]
      .filter(Boolean)
      .join(" · ");

  // Focus once on open (not again on every parent render).
  useEffect(() => fileInput.current?.focus(), []);

  // Esc closes unless saving.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const pick = (list: FileList | null) => {
    const next = Array.from(list ?? []);
    if (!next.length) return;
    setFiles(next);
    setTitle(next.length === 1 ? classify(next[0].name, manual).title : "");
    setErrors([]);
    setNotice(null);
  };

  const changeMode = (m: Mode) => {
    setMode(m);
    setHazard((h) => hazardFor(m, h));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length || busy) return;
    const rejected: string[] = [];
    const valid = files
      .map((f, i) => ({ f, meta: detected[i] }))
      .filter(({ f }) => {
        const why = checkFile(f);
        if (why) rejected.push(`${f.name} — ${why}`);
        return !why;
      });
    if (!valid.length) {
      setErrors(rejected);
      return;
    }
    if (valid.some(({ meta }) => meta.kind !== "hz" && !meta.topic)) {
      setErrors(["Элемент сонгоно уу."]);
      return;
    }

    setBusy(true);
    const saved: LocalMapRecord[] = [];
    try {
      for (const { f, meta } of valid) {
        saved.push(
          await addLocalMap(
            {
              title: (files.length === 1 && title.trim()) || meta.title,
              kind: meta.kind,
              topic: meta.topic,
              hazard: meta.hazard,
              scope: meta.scope,
              lang: meta.lang,
              unit: meta.unit,
            },
            f,
          ),
        );
      }
    } catch {
      rejected.push(
        "Хөтөч зураг хадгалахыг зөвшөөрсөнгүй (нууц цонх эсвэл санах ой дүүрсэн байж магадгүй).",
      );
    }
    setBusy(false);

    if (saved.length) onDone(saved);
    if (!rejected.length) {
      onClose();
      return;
    }
    setFiles([]);
    setTitle("");
    setErrors(rejected);
    setNotice(saved.length ? `${saved.length} зураг нэмэгдлээ.` : null);
  };

  // A file dropped beside the drop zone must not open in the tab.
  const stopDrop = (e: React.DragEvent) => e.preventDefault();

  return (
    <div
      className={styles.dialogBackdrop}
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
      onDragOver={stopDrop}
      onDrop={stopDrop}
    >
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
        onSubmit={submit}
      >
        <header className={styles.dialogHead}>
          <h2 id="upload-title">
            <Icon name="upload" size={16} />
            Зураг оруулах
          </h2>
          <button
            type="button"
            className={styles.dialogClose}
            onClick={onClose}
            disabled={busy}
            aria-label="Хаах"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className={styles.dialogBody}>
          <label
            className={styles.dropZone}
            data-dragging={dragging}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files);
            }}
          >
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={ACCEPT.join(",")}
              onChange={(e) => pick(e.target.files)}
            />
            <Icon name="image" size={22} />
            <strong>
              {files.length
                ? `${files.length} файл сонгосон`
                : "Файл сонгох эсвэл энд чирж оруулах"}
            </strong>
            <span>JPG, PNG, WebP · 25MB хүртэл · ангиллыг файлын нэрээс автоматаар уншина</span>
          </label>

          {files.length > 0 && (
            <ul className={styles.fileList}>
              {files.map((f, i) => (
                <li key={`${i}-${f.name}`}>
                  <strong title={f.name}>{f.name}</strong>
                  {detected[i].auto ? (
                    <span className={styles.fileAuto}>
                      <Icon name="label" size={12} />
                      {describe(detected[i])}
                    </span>
                  ) : (
                    <span className={styles.fileManual}>
                      Нэрээр танигдсангүй — доорх сонголтоор
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {files.length === 1 && (
            <label className={dash.locationField}>
              <span>Гарчиг</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
          )}

          {needsManual && (
            <>
              <div className={dash.locationField}>
                <span>Үзүүлэлт</span>
                <div
                  className={`${dash.segmented} ${dash.segmented3}`}
                  role="group"
                  aria-label="Үзүүлэлт"
                >
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={mode === m.id}
                      onClick={() => changeMode(m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {mode !== "hz" && (
                <label className={dash.locationField}>
                  <span>Элемент</span>
                  <select value={topicId} onChange={(e) => setTopic(e.target.value)}>
                    {modeTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className={styles.dialogRow}>
                <label className={dash.locationField}>
                  <span>Аюулт үзэгдэл</span>
                  <select value={hazard} onChange={(e) => setHazard(e.target.value)}>
                    {mode !== "hz" && <option value="all">Бүх аюул</option>}
                    {(mode === "hz" ? ZONING_HAZARDS : HAZARDS).map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={dash.locationField}>
                  <span>Хамрах хүрээ</span>
                  <select value={scope} onChange={(e) => setScope(e.target.value)}>
                    <option value="MN">Улсын хэмжээ</option>
                    <optgroup label="Аймаг">
                      {aimagList.map(([key, name]) => (
                        <option key={key} value={key}>
                          {name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
              </div>
            </>
          )}

          {notice && <p className={styles.dialogNotice}>{notice}</p>}
          {errors.length > 0 && (
            <ul className={styles.dialogErrors} role="alert">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        <footer className={styles.dialogFoot}>
          <button
            type="button"
            className={styles.dialogSecondary}
            onClick={onClose}
            disabled={busy}
          >
            Болих
          </button>
          <button
            type="submit"
            className={styles.dialogPrimary}
            disabled={!files.length || busy}
          >
            {busy ? "Хадгалж байна…" : "Оруулах"}
          </button>
        </footer>
      </form>
    </div>
  );
}
