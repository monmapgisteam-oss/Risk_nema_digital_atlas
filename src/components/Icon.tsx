import type { CSSProperties } from "react";
import { ICON_PATHS, type IconName } from "@/lib/iconPaths";

export type { IconName } from "@/lib/iconPaths";

export default function Icon({
  name,
  size = 18,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, ...style }}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
