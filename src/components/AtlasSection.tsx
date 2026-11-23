"use client";

import dynamic from "next/dynamic";
import styles from "./MapSection.module.css";

// The atlas portals its toolbar into the page header, so it renders on the
// client only (no server markup to hydrate against).
const Atlas = dynamic(() => import("./Atlas"), {
  ssr: false,
  loading: () => (
    <div className={styles.loading} role="status">
      <span className={styles.spinner} />
      <strong>Эрсдэлийн дижитал атлас</strong>
      <span>Газрын зургуудыг бэлтгэж байна…</span>
    </div>
  ),
});

export default function AtlasSection() {
  return <Atlas />;
}
