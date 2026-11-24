import { cacheLife } from "next/cache";
import type { AtlasItem, AtlasTopic, Manifest } from "./atlas";
import { AIMAGS, TOPICS, parseMapName, type Parsed } from "./mapNames";

export { AIMAGS };

/** ArcGIS Enterprise portal that holds the atlas maps (public "Image" items). */
export const PORTAL = "https://arcgis.ubhub.mn/arcgis";
const REST = `${PORTAL}/sharing/rest`;

type PortalItem = {
  id: string;
  title: string;
  name: string | null;
  type: string;
  tags: string[];
  thumbnail: string | null;
  modified: number;
};

async function search(start: number) {
  const q = new URLSearchParams({
    q: 'type:"Image" AND access:public',
    num: "100",
    start: String(start),
    sortField: "title",
    f: "json",
  });
  const res = await fetch(`${REST}/search?${q}`);
  if (!res.ok) throw new Error(`portal search ${res.status}`);
  return (await res.json()) as { results: PortalItem[]; nextStart: number };
}

/** All atlas maps on the portal, re-read at most once a minute. */
export async function loadManifest(): Promise<Manifest> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });

  const raw: PortalItem[] = [];
  for (let start = 1; start > 0; ) {
    const page = await search(start);
    raw.push(...page.results);
    start = page.nextStart;
  }
  const parsed = raw
    .filter((i) => i.type === "Image")
    .map(parseMapName)
    .filter((i): i is Parsed => i != null);

  // Mongolian view: a Mongolian map replaces the English ones of the same
  // topic, kind, place and hazard; English-only maps stay.
  const key = (i: Parsed) => `${i.topic}|${i.kind}|${i.scope}|${i.group}`;
  const mnKeys = new Set(parsed.filter((i) => i.lang === "mn").map(key));
  const thumbs = new Map(raw.map((i) => [i.id, i.thumbnail]));
  const items: AtlasItem[] = parsed.map(({ group: _group, ...i }) => {
    const img = `${REST}/content/items/${i.id}/data`;
    const thumb = thumbs.get(i.id);
    return {
      ...i,
      mn: i.lang === "mn" || !mnKeys.has(key({ ...i, group: _group })),
      en: i.lang === "en",
      img,
      thumb: thumb ? `${REST}/content/items/${i.id}/info/${thumb}` : img,
    };
  });

  const kinds = new Map<string, Set<string>>();
  for (const i of items) {
    if (!kinds.has(i.topic)) kinds.set(i.topic, new Set());
    kinds.get(i.topic)!.add(i.kind);
  }
  // Every element is listed, also before its maps are uploaded.
  const topics: AtlasTopic[] = [
    { id: "hazards", no: "0", name: "Аюулын бүсчлэл", cat: "HZ", kinds: ["hz"] },
    ...TOPICS.map(([id, no, cat, name, k]) => ({
      id,
      no,
      cat,
      name,
      kinds: [...new Set([...k.split(" "), ...(kinds.get(id) ?? [])])].sort(),
    })),
  ];
  return { topics, aimags: AIMAGS, items };
}
