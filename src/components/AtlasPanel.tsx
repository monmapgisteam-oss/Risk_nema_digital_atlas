"use client";

import {
  CATEGORIES,
  HAZARDS,
  MODES,
  TOPIC_ICONS,
  type AtlasTopic,
} from "@/lib/atlas";
import type { AtlasFilters } from "./Atlas";
import Icon from "./Icon";
import dash from "./Dashboard.module.css";

type Props = {
  filters: AtlasFilters;
  update: (patch: Partial<AtlasFilters>) => void;
  /** Elements of the current view (empty in the hazard view). */
  topics: AtlasTopic[];
  topic: string;
};

export default function AtlasPanel({
  filters,
  update,
  topics,
  topic,
}: Props) {
  const hazardView = filters.mode === "hz";
  // Every hazard is listed, also before its maps are uploaded.
  const hazardList = hazardView ? HAZARDS.filter((h) => h.id !== "mh") : HAZARDS;

  return (
    <aside
      className={`${dash.panel} ${dash.filterPanel}`}
      aria-label="Шүүлтүүр"
    >
      <div className={dash.filterBody}>
        <div
          className={`${dash.segmented} ${dash.segmented3}`}
          role="group"
          aria-label="Үзүүлэлт"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={filters.mode === m.id}
              onClick={() => update({ mode: m.id, hazard: "all" })}
            >
              {m.label}
            </button>
          ))}
        </div>

        {!hazardView && (
          <div className={dash.group}>
            <span className={dash.sectionLabel}>
              <span className={dash.caps}>Элемент</span>
              <span>{topics.length} төрөл</span>
            </span>
            {CATEGORIES.map(({ label, cats }) => {
              const list = topics.filter((t) => cats.includes(t.cat));
              if (!list.length) return null;
              return (
                <div key={label} className={dash.overlayGroup}>
                  <span className={dash.overlayGroupLabel}>
                    {label}
                    <span>{list.length}</span>
                  </span>
                  <div className={dash.overlayGrid} role="group" aria-label={label}>
                    {list.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={dash.hazardChip}
                        aria-pressed={topic === t.id}
                        onClick={() => update({ topic: t.id, hazard: "all" })}
                      >
                        <Icon name={TOPIC_ICONS[t.id] ?? "layers"} size={16} />
                        <span className={dash.optionLabel}>{t.name}</span>
                        {topic === t.id && <span className={dash.selectedDot} />}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className={dash.group}>
          <span className={dash.sectionLabel}>
            <span className={dash.caps}>Аюулт үзэгдэл</span>
            <span>{hazardList.length} төрөл</span>
          </span>
          <div
            className={`${dash.hazardGrid} ${hazardView ? dash.hazardList : ""}`}
          >
            <button
              type="button"
              className={dash.hazardChip}
              aria-pressed={filters.hazard === "all"}
              onClick={() => update({ hazard: "all" })}
            >
              <Icon name="all" size={16} />
              Бүх аюул
              {filters.hazard === "all" && <span className={dash.selectedDot} />}
            </button>
            {hazardList.map((h) => (
              <button
                key={h.id}
                type="button"
                className={dash.hazardChip}
                aria-pressed={filters.hazard === h.id}
                onClick={() => update({ hazard: h.id })}
              >
                <Icon name={h.icon} size={16} />
                {h.label}
                {filters.hazard === h.id && <span className={dash.selectedDot} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
