import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesSearch } from "../src/lib/atlas.ts";

const item = {
  title: "Зуд · Дунд-маш их өртөлтийн хувь",
  file: "Exp1.10_Communities_SH-DZ_EL345_bySoum_Provincial_Dornod.png",
};

test("empty search matches everything", () => {
  assert.equal(matchesSearch(item, "   "), true);
});

test("search matches file name and title, any case", () => {
  assert.equal(matchesSearch(item, "communities"), true);
  assert.equal(matchesSearch(item, "DORNOD"), true);
  assert.equal(matchesSearch(item, "ЗУД"), true);
});

test("every word must match", () => {
  assert.equal(matchesSearch(item, "communities dornod"), true);
  assert.equal(matchesSearch(item, "communities khovd"), false);
});
