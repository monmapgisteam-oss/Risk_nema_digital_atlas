import { cacheLife } from "next/cache";
import type { AtlasItem, AtlasTopic, Manifest } from "./atlas";

/** ArcGIS Enterprise portal that holds the atlas maps (public "Image" items). */
export const PORTAL = "https://arcgis.ubhub.mn/arcgis";
const REST = `${PORTAL}/sharing/rest`;

/** Element topics: file-name token (lower case) -> number, category, name, map kinds. */
const TOPICS: [string, string, string, string, string][] = [
  ["communities", "1.0", "CM", "Баг", "exp vul"],
  ["household", "2.0", "HH", "Өрх", "exp vul"],
  ["population", "3.0", "PP", "Хүн ам", "exp vul"],
  ["housebyarea", "4.1", "RB", "Орон сууц (талбай)", "exp"],
  ["housebydwelling", "4.2", "RB", "Орон сууц (төрөл)", "exp"],
  ["educationalfacilities", "5.1", "CF", "Боловсрол", "exp vul"],
  ["healthfacilities", "5.2", "CF", "Эрүүл мэнд", "exp"],
  ["bridges", "5.3.1", "CF", "Гүүр", "exp vul"],
  ["culverts", "5.3.2", "CF", "Хоолой", "expvul"],
  ["gasstations", "5.3.4", "CF", "ШТС", "exp"],
  ["warehouses", "5.3.5", "CF", "Агуулах", "expvul"],
  ["terminals", "5.3.6", "CF", "Терминал", "exp"],
  ["airports", "5.3.7", "CF", "Нисэх буудал", "exp"],
  ["borderports", "5.3.8", "CF", "Хилийн боомт", "exp"],
  ["maintainanceservices", "5.3.9", "CF", "Засвар үйлчилгээ", "exp"],
  ["commfacilities", "5.4", "CF", "Холбооны байгууламж", "exp"],
  ["powerstation", "5.5.1", "CF", "Цахилгаан станц", "expvul"],
  ["transformerstation", "5.5.2", "CF", "Дэд станц", "expvul"],
  ["culturalsites", "5.8", "CF", "Соёлын өв", "exp"],
  ["miningsites", "5.9", "CF", "Уурхай", "exp"],
  ["stateroad", "6.1", "NI", "Улсын зам", "expvul"],
  ["railway", "6.2", "NI", "Төмөр зам", "exp"],
  ["powerline", "6.3", "NI", "Цахилгааны шугам", "expvul"],
  ["commline", "6.4", "NI", "Холбооны шугам", "expvul"],
  ["farmland", "7.1", "LA", "Тариалангийн талбай", "expvul"],
  ["pasture", "7.2", "LA", "Бэлчээр", "expvul"],
  ["crop", "8.0", "CR", "Газар тариалан", "exp"],
  ["crophouseholds", "8.1", "CR", "Тариалангийн өрх", "exp"],
  ["cropenterprise", "8.2", "CR", "Тариалангийн ААН", "exp"],
  ["livestock", "9.0", "LS", "Мал", "exp"],
  ["enterprises", "10.0", "EN", "Аж ахуйн нэгж", "exp vul"],
];
const TOPIC_ALIAS: Record<string, string> = {
  maintainancesevices: "maintainanceservices",
};

export const AIMAGS: Record<string, string> = {
  Arkhangai: "Архангай", "Bayan-Ulgii": "Баян-Өлгий", Bayankhongor: "Баянхонгор",
  Bulgan: "Булган", "Darkhan-Uul": "Дархан-Уул", Dornod: "Дорнод",
  Dornogobi: "Дорноговь", Dundgobi: "Дундговь", "Gobi-Altai": "Говь-Алтай",
  Gobisumber: "Говьсүмбэр", Khentii: "Хэнтий", Khovd: "Ховд",
  Khuvsgul: "Хөвсгөл", Orkhon: "Орхон", Selenge: "Сэлэнгэ",
  Sukhbaatar: "Сүхбаатар", Tuv: "Төв", Ulaanbaatar: "Улаанбаатар",
  Umnugobi: "Өмнөговь", Uvs: "Увс", Uvurkhangai: "Өвөрхангай", Zavkhan: "Завхан",
};
const AIMAG_BY_MN = Object.fromEntries(Object.entries(AIMAGS).map(([k, v]) => [v, k]));

const HAZARD_CODES: Record<string, string> = {
  MH: "mh", EQ: "eq", DS: "ds", WS: "ws", SS: "ss", DR: "dr",
  DZ: "dz", FL: "fl", WF: "wf", ZD: "zd", LT: "lt",
};

/** Hazard zoning maps: sub-code -> hazard, Mongolian title. */
const HAZARD_MAPS: Record<string, [string, string]> = {
  H01a: ["eq", "Газар хөдлөлтийн эрчим (500 жил)"],
  H01b: ["eq", "Газар хөдлөлтийн эрчим (2500 жил)"],
  H02a: ["ds", "Шороон шуурганы аюулын давтамж"],
  H02b: ["ds", "Шороон шуурганы зөөгдлийн эмзэг бүс"],
  H02c: ["ds", "Тоосонцортой өдрийн эмзэг бүс"],
  H03a: ["ws", "Хүчтэй салхины аюулын муж"],
  H03b: ["ws", "Салхины эрчим (1 жил)"],
  H03c: ["ws", "Салхины эрчим (5 жил)"],
  H03d: ["ws", "Салхины эрчим (10 жил)"],
  H03e: ["ws", "Салхины эрчим (20 жил)"],
  H03f: ["ws", "Салхины ачааллын эрчим (20 жил)"],
  H04a: ["ss", "Цасан шуурганы давтамж"],
  H04b: ["ss", "Цасны ачааллын муж"],
  H05: ["dr", "Гангийн давтамж"],
  H06a: ["dz", "Цагаан зудын муж"],
  H06b: ["dz", "Зудын нэгдсэн муж"],
  H06d: ["dz", "Хар зудын муж"],
  H07a: ["fl", "Уруйн үерийн муж"],
  H07b: ["fl", "Хур борооны үерийн муж"],
  H07c: ["fl", "Шар усны үерийн муж"],
  H07d: ["fl", "Олон төрлийн үерийн муж"],
  H08a: ["wf", "Ойн түймрийн муж"],
  H08b: ["wf", "Хээрийн түймрийн муж"],
  H08c: ["wf", "Ой хээрийн түймрийн нэгдсэн муж"],
  H09b: ["zd", "Тарваган тахлын идэвхтэй голомт"],
  H09c: ["zd", "Галзуу өвчний муж"],
  H09d: ["zd", "Зоонозын нэгдсэн муж"],
  H11a: ["lt", "Аянга цахилгааны аюулын муж"],
  H11b: ["lt", "Аянга цахилгааны эрчим"],
};

type Rules = [RegExp, string][];
const first = (rules: Rules, text: string) => rules.find(([re]) => re.test(text))?.[1] ?? null;

/** English hazard map names -> sub-code (first match wins). */
const HAZARD_EN: Rules = [
  [/seismic.*2500|eq_2500/i, "H01b"], [/seismic|eq_500/i, "H01a"],
  [/drifting/i, "H02b"], [/dusty/i, "H02c"], [/dust|_ds_/i, "H02a"],
  [/(01y|01yrp|1-year)/i, "H03b"], [/(05y|05yrp|5-year)/i, "H03c"],
  [/(10y|10yrp|10-year)/i, "H03d"], [/(20y|20yrp|20-year)(?!.*load)/i, "H03e"],
  [/wind ?load|ws_wl/i, "H03f"], [/wind/i, "H03a"],
  [/snow ?load|ss-load/i, "H04b"], [/snowstorm|ss_irimhe/i, "H04a"],
  [/drought|^h05/i, "H05"],
  [/white/i, "H06a"], [/black/i, "H06d"], [/dzud|dz_int/i, "H06b"],
  [/3flood|flood_int|3f/i, "H07d"], [/flash|flood_f\b|flood_f_/i, "H07a"],
  [/flood_rain|flood_r/i, "H07b"], [/flood_snow|flood_s/i, "H07c"],
  [/forest/i, "H08a"], [/steppe/i, "H08b"], [/wildfire|wild_?fire/i, "H08c"],
  [/plague/i, "H09b"], [/rabies|rabbies/i, "H09c"], [/zoonotic/i, "H09d"],
  [/lightning.*intensity|lt_intensity/i, "H11b"], [/lightning|lt_suscept/i, "H11a"],
];
/** Mongolian hazard map titles -> sub-code. */
const HAZARD_MN: Rules = [
  [/2500/i, "H01b"], [/газар хөдлөл/i, "H01a"], [/шороон шуурга/i, "H02a"],
  [/1 жилд/i, "H03b"], [/5 жилд/i, "H03c"], [/10 жилд/i, "H03d"], [/20 жилд/i, "H03e"],
  [/салхи/i, "H03a"], [/цасан шуурга/i, "H04a"], [/цасны ачаал/i, "H04b"],
  [/ган/i, "H05"],
  [/олон төрлийн үер/i, "H07d"], [/уруйн үер/i, "H07a"], [/хур борооны/i, "H07b"],
  [/шар усны/i, "H07c"],
  [/ой хээрийн түймр/i, "H08c"], [/ойн түймр/i, "H08a"], [/хээрийн түймр/i, "H08b"],
  [/тахал/i, "H09b"], [/галзуу/i, "H09c"], [/зооноз/i, "H09d"],
  [/аянга.*эрчм/i, "H11b"], [/аянга/i, "H11a"],
];

const HAZARD_MN_NAME: Record<string, string> = {
  mh: "Олон аюул", eq: "Газар хөдлөлт", ds: "Шороон шуурга", ws: "Салхин шуурга",
  ss: "Цасан шуурга", dr: "Ган", dz: "Зуд", fl: "Үер", wf: "Түймэр",
  zd: "Зооноз", lt: "Аянга",
};
const INDICATORS: Record<string, string> = {
  majorh: "Зонхилох аюул", majorh345: "Зонхилох аюул",
  mhei: "Олон аюулд өртөх индекс", mhei345: "Олон аюулд өртөх индекс",
  el345: "Дунд-маш их өртөлтийн хувь", vl45: "Их, маш их эмзэг байдлын хувь",
  cvi: "Нэгдсэн эмзэг байдлын индекс", hvi: "Хүн амын эмзэг байдлын индекс",
  hhvi: "Өрхийн эмзэг байдлын индекс", lvi: "Малын эмзэг байдлын индекс",
  pvi: "Физик эмзэг байдлын индекс", dvi: "Орон сууцны эмзэг байдлын индекс",
  evi: "ААН-ийн эмзэг байдлын индекс",
};
const UNITS: Rules = [
  [/bag/i, "багаар"], [/so?u?m|sum/i, "сумаар"], [/aimag/i, "аймгаар"],
  [/feature/i, "объектоор"], [/segment/i, "хэсгээр"], [/section/i, "хэсэглэлээр"],
];

type PortalItem = {
  id: string;
  title: string;
  name: string | null;
  type: string;
  tags: string[];
  thumbnail: string | null;
  modified: number;
};

type Parsed = Omit<AtlasItem, "mn" | "en" | "img" | "thumb"> & { group: string };

/** Item tags like "hazard:wf" or "scope:Dornod" override what the name says. */
function tagMap(tags: string[]) {
  const out: Record<string, string> = {};
  for (const t of tags) {
    const m = /^(topic|kind|hazard|scope|lang|unit):(.+)$/i.exec(t.trim());
    if (m) out[m[1].toLowerCase()] = m[2].trim();
  }
  return out;
}

function parse(item: PortalItem): Parsed | null {
  const stem = (item.name ?? item.title).replace(/\.(jpe?g|png|webp)$/i, "");
  const tags = tagMap(item.tags);
  const lang = (tags.lang as "mn" | "en") ?? (/[а-яөү]/i.test(stem) ? "mn" : "en");

  // Where: national unless the name ends with an aimag.
  const tail = stem.split("_").pop() ?? "";
  const scope =
    tags.scope ??
    (/provin/i.test(stem) ? (AIMAGS[tail] ? tail : null) : AIMAG_BY_MN[tail] ?? "MN");
  if (!scope) return null;

  const base = {
    id: item.id,
    scope,
    lang,
    title: item.title,
    unit: tags.unit ?? null,
    file: item.name ?? item.title,
    modified: item.modified,
  };

  // Hazard zoning map: H-code or a known hazard name.
  const code = /^(H\d\d[a-z]?)/.exec(stem)?.[1];
  let sub = lang === "mn" && !/өрт|эмзэг/i.test(stem) ? first(HAZARD_MN, stem) : null;
  sub = sub ?? ({ H02: "H02a", H08d: "H08c" }[code ?? ""] || code || null);
  if (!sub || !HAZARD_MAPS[sub]) sub = /^H\d/.test(stem) ? first(HAZARD_EN, stem.toLowerCase()) : null;
  if (tags.topic === "hazards" || tags.kind === "hz" || (sub && HAZARD_MAPS[sub] && !tags.topic)) {
    const hazard = tags.hazard ?? (sub ? HAZARD_MAPS[sub]?.[0] : null) ?? null;
    if (!hazard) return null;
    return {
      ...base,
      topic: "hazards",
      kind: "hz",
      hazard,
      title: lang === "mn" ? item.title : (sub && HAZARD_MAPS[sub]?.[1]) || item.title,
      group: sub ?? hazard,
    };
  }

  // Element map: Exp1.10_Communities_SH-DZ_EL345_bySoum_national.
  const m = /^(ExpVul|Exp|Vul)[\d.]+_(?:[A-Z]{2}_)?([A-Za-z]+)_/.exec(stem);
  const hz = /(?:^|_|[a-z])(MH|SH-[A-Z]{2})_([A-Za-z0-9]+)/.exec(stem);
  const by = /_(by[A-Za-z]+)/.exec(stem);
  const token = m ? m[2].toLowerCase() : "";
  const topic = tags.topic ?? TOPIC_ALIAS[token] ?? token;
  if (!TOPICS.some(([id]) => id === topic)) return null;
  const kind = (tags.kind ?? m?.[1].toLowerCase() ?? "expvul") as AtlasItem["kind"];
  const hazard = tags.hazard ?? (hz ? HAZARD_CODES[hz[1].replace("SH-", "")] : null) ?? null;
  const ind = hz?.[2].toLowerCase();
  return {
    ...base,
    topic,
    kind,
    hazard,
    unit: tags.unit ?? (by ? first(UNITS, by[1].slice(2)) ?? by[1].slice(2) : null),
    title:
      lang === "mn" || !ind
        ? item.title
        : [hazard && HAZARD_MN_NAME[hazard], INDICATORS[ind] ?? ind.toUpperCase()]
            .filter(Boolean)
            .join(" · "),
    group: hazard ?? "-",
  };
}

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
    .map(parse)
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
