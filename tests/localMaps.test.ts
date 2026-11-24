import { test } from "node:test";
import assert from "node:assert/strict";
import { checkFile, toAtlasItem, MAX_BYTES } from "../src/lib/localMaps.ts";

test("checkFile accepts images up to 25MB and rejects others", () => {
  assert.equal(checkFile({ type: "image/png", size: 1000 }), null);
  assert.equal(checkFile({ type: "image/webp", size: MAX_BYTES }), null);
  assert.equal(
    checkFile({ type: "application/pdf", size: 10 }),
    "Зөвхөн JPG, PNG, WebP зураг оруулна.",
  );
  assert.equal(
    checkFile({ type: "image/jpeg", size: MAX_BYTES + 1 }),
    "Файл 25MB-аас их байна.",
  );
});

test("toAtlasItem marks the map as a local Mongolian map", () => {
  const it = toAtlasItem(
    {
      id: "local-1",
      file: "a.png",
      title: "A",
      kind: "hz",
      topic: "hazards",
      hazard: "wf",
      scope: "MN",
      modified: 5,
    },
    "blob:x",
  );
  assert.deepEqual(
    {
      id: it.id,
      img: it.img,
      thumb: it.thumb,
      lang: it.lang,
      mn: it.mn,
      en: it.en,
      local: it.local,
      unit: it.unit,
      hazard: it.hazard,
      kind: it.kind,
      topic: it.topic,
    },
    {
      id: "local-1",
      img: "blob:x",
      thumb: "blob:x",
      lang: "mn",
      mn: true,
      en: false,
      local: true,
      unit: null,
      hazard: "wf",
      kind: "hz",
      topic: "hazards",
    },
  );
});

test("newId works without crypto.randomUUID (plain-http LAN origin)", async () => {
  const { newId } = await import("../src/lib/localMaps.ts");
  const orig = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(crypto), "randomUUID");
  Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
  try {
    const a = newId();
    const b = newId();
    assert.match(a, /^local-[0-9a-f]{32}$/);
    assert.notEqual(a, b);
  } finally {
    delete (crypto as unknown as Record<string, unknown>).randomUUID;
    if (orig) assert.equal(typeof crypto.randomUUID, "function");
  }
});

const fallback = {
  title: "",
  kind: "vul" as const,
  topic: "household",
  hazard: null,
  scope: "Tuv",
};

test("classify reads the map's place from a recognised file name", async () => {
  const { classify } = await import("../src/lib/mapNames.ts");
  const c = classify("Exp1.10_Communities_SH-DZ_EL345_bySoum_Provincial_Dornod.png", fallback);
  assert.deepEqual(
    { auto: c.auto, kind: c.kind, topic: c.topic, hazard: c.hazard, scope: c.scope, unit: c.unit, lang: c.lang },
    { auto: true, kind: "exp", topic: "communities", hazard: "dz", scope: "Dornod", unit: "сумаар", lang: "en" },
  );
});

test("classify falls back to the manual choice for an unknown name", async () => {
  const { classify } = await import("../src/lib/mapNames.ts");
  const c = classify("photo.final.png", fallback);
  assert.deepEqual(c, { ...fallback, title: "photo.final", lang: "mn", unit: null, auto: false });
});

test("toAtlasItem keeps an English map's language and unit", () => {
  const it = toAtlasItem(
    { id: "local-2", file: "a.png", title: "A", kind: "exp", topic: "communities",
      hazard: "dz", scope: "MN", modified: 1, lang: "en", unit: "сумаар" },
    "blob:y",
  );
  assert.deepEqual({ lang: it.lang, en: it.en, mn: it.mn, unit: it.unit }, { lang: "en", en: true, mn: true, unit: "сумаар" });
});
