import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMapName } from "../src/lib/mapNames.ts";

const named = (name: string) =>
  parseMapName({ id: "x", title: name.replace(/\.[^.]+$/, ""), name, tags: [], modified: 0 });

test("hazard zoning code in an English file name", () => {
  const p = named("H08a_Forest_Fire_Zoning.png");
  assert.ok(p);
  assert.deepEqual(
    { topic: p.topic, kind: p.kind, hazard: p.hazard, scope: p.scope, lang: p.lang, title: p.title },
    { topic: "hazards", kind: "hz", hazard: "wf", scope: "MN", lang: "en", title: "Ойн түймрийн муж" },
  );
});

test("element map with hazard, unit and province", () => {
  const p = named("Exp1.10_Communities_SH-DZ_EL345_bySoum_Provincial_Dornod.png");
  assert.ok(p);
  assert.deepEqual(
    { topic: p.topic, kind: p.kind, hazard: p.hazard, scope: p.scope, unit: p.unit, title: p.title },
    {
      topic: "communities",
      kind: "exp",
      hazard: "dz",
      scope: "Dornod",
      unit: "сумаар",
      title: "Зуд · Дунд-маш их өртөлтийн хувь",
    },
  );
});

test("Mongolian hazard title with an aimag suffix", () => {
  const p = named("Ойн түймрийн муж_Дорнод.jpg");
  assert.ok(p);
  assert.deepEqual(
    { kind: p.kind, hazard: p.hazard, scope: p.scope, lang: p.lang },
    { kind: "hz", hazard: "wf", scope: "Dornod", lang: "mn" },
  );
});

test("unrecognised file name", () => {
  assert.equal(named("my_photo.png"), null);
});
