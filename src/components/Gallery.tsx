"use client";

import { hazardLabel, type AtlasItem } from "@/lib/atlas";
import Icon from "./Icon";
import dash from "./Dashboard.module.css";
import styles from "./Atlas.module.css";

type Props = {
  items: AtlasItem[];
  aimags: Record<string, string>;
  heading: string;
  /** Loading / error text instead of the grid. */
  status: string | null;
  onOpen: (index: number) => void;
  /** Removes a map added from this computer. */
  onDelete: (id: string) => void;
};

export default function Gallery({
  items,
  aimags,
  heading,
  status,
  onOpen,
  onDelete,
}: Props) {
  return (
    <section className={`${dash.panel} ${styles.gallery}`} aria-label="Газрын зургууд">
      <header className={styles.galleryHead}>
        <h2>{heading}</h2>
        <span>
          <Icon name="image" size={14} />
          {items.length} газрын зураг
        </span>
      </header>
      {status ? (
        <p className={styles.empty}>{status}</p>
      ) : !items.length ? (
        <p className={styles.empty}>Сонголтод тохирох газрын зураг алга.</p>
      ) : (
        <ul className={styles.grid}>
          {items.map((item, i) => (
            <li key={item.id} className={styles.cardItem}>
              <button
                type="button"
                className={styles.card}
                onClick={() => onOpen(i)}
                title={item.title}
              >
                <span className={styles.thumb}>
                  {/* Portal thumbnails; next/image would re-encode them. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumb}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  {item.local && (
                    <span className={styles.localBadge}>Таны оруулсан</span>
                  )}
                </span>
                <span className={styles.cardText}>
                  <strong>{item.title}</strong>
                  <span>
                    {[
                      item.scope === "MN" ? "Улс" : (aimags[item.scope] ?? item.scope),
                      item.hazard && !item.title.includes(hazardLabel(item.hazard))
                        ? hazardLabel(item.hazard)
                        : null,
                      item.unit,
                      item.lang === "en" ? "EN" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </button>
              {item.local && (
                <button
                  type="button"
                  className={styles.cardDelete}
                  onClick={() => onDelete(item.id)}
                  aria-label={`Устгах: ${item.title}`}
                  title="Устгах"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
