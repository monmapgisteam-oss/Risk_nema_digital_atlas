import type { IconName } from "./iconPaths";

/** One map of the atlas (an "Image" item on the portal, see lib/portal.ts). */
export type AtlasItem = {
  id: string;
  topic: string;
  /** hz = hazard zoning; vul / exp; expvul = both. */
  kind: "hz" | "vul" | "exp" | "expvul";
  hazard: string | null;
  /** "MN" = national, otherwise the aimag key (e.g. "Dornod"). */
  scope: string;
  lang: "mn" | "en";
  /** Shown in the Mongolian / English view. */
  mn: boolean;
  en: boolean;
  title: string;
  unit: string | null;
  file: string;
  /** Full image and gallery thumbnail URLs. */
  img: string;
  thumb: string;
  modified: number;
};

export type AtlasTopic = {
  id: string;
  no: string;
  name: string;
  cat: string;
  kinds: string[];
};

export type Manifest = {
  topics: AtlasTopic[];
  aimags: Record<string, string>;
  items: AtlasItem[];
};

export type Mode = "hz" | "vul" | "exp";
export const MODES: { id: Mode; label: string }[] = [
  { id: "hz", label: "Аюул" },
  { id: "vul", label: "Эмзэг байдал" },
  { id: "exp", label: "Өртөх байдал" },
];

export const matchesMode = (kind: AtlasItem["kind"], mode: Mode) =>
  mode === "hz" ? kind === "hz" : kind === mode || kind === "expvul";

/** Same order as the risk map's hazard list (wildfire first). */
export const HAZARDS: { id: string; label: string; icon: IconName }[] = [
  { id: "mh", label: "Олон аюул", icon: "layers" },
  { id: "wf", label: "Түймэр", icon: "wf" },
  { id: "ds", label: "Шороон шуурга", icon: "ds" },
  { id: "ws", label: "Салхин шуурга", icon: "ws" },
  { id: "ss", label: "Цасан шуурга", icon: "ss" },
  { id: "dr", label: "Ган", icon: "dr" },
  { id: "dz", label: "Зуд", icon: "dz" },
  { id: "fl", label: "Үер", icon: "fl" },
  { id: "eq", label: "Газар хөдлөлт", icon: "eq" },
  { id: "zd", label: "Зооноз", icon: "zd" },
  { id: "lt", label: "Аянга", icon: "lt" },
];
export const hazardLabel = (id: string | null) =>
  HAZARDS.find((h) => h.id === id)?.label ?? "";

/** Element groups for the topic list, by the atlas category code. */
export const CATEGORIES: { label: string; cats: string[] }[] = [
  { label: "Хүн ам, өрх", cats: ["CM", "HH", "PP"] },
  { label: "Орон сууц", cats: ["RB"] },
  { label: "Нийтийн байгууламж", cats: ["CF"] },
  { label: "Шугам сүлжээ", cats: ["NI"] },
  { label: "Газар, хөдөө аж ахуй", cats: ["LA", "CR", "LS"] },
  { label: "Аж ахуйн нэгж", cats: ["EN"] },
];

export const TOPIC_ICONS: Record<string, IconName> = {
  communities: "users",
  household: "home",
  population: "users",
  housebyarea: "home",
  housebydwelling: "home",
  educationalfacilities: "school",
  healthfacilities: "hospital",
  bridges: "bridge",
  culverts: "pipe",
  gasstations: "fuel",
  warehouses: "warehouse",
  terminals: "warehouse",
  airports: "gate",
  borderports: "gate",
  maintainanceservices: "wrench",
  commfacilities: "tower",
  powerstation: "lt",
  transformerstation: "lt",
  culturalsites: "landmark",
  miningsites: "pickaxe",
  stateroad: "road",
  railway: "train",
  powerline: "lt",
  commline: "tower",
  farmland: "wheat",
  pasture: "grass",
  crop: "wheat",
  crophouseholds: "home",
  cropenterprise: "building",
  livestock: "livestock",
  enterprises: "building",
};

const HAZARD_ORDER = new Map(HAZARDS.map((h, i) => [h.id, i]));
const natural = new Intl.Collator("mn", { numeric: true, sensitivity: "base" });

/** Gallery order: hazard (multi-hazard first), then file name. */
export const compareItems = (a: AtlasItem, b: AtlasItem) =>
  (HAZARD_ORDER.get(a.hazard ?? "") ?? 99) -
    (HAZARD_ORDER.get(b.hazard ?? "") ?? 99) ||
  natural.compare(a.file, b.file);
