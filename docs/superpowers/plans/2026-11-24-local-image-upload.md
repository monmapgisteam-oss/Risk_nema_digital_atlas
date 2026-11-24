# Компьютерээс зураг оруулах (демо) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Хэрэглэгч компьютерээсээ газрын зураг сонгож атласт нэмэх; зураг хөтчийн IndexedDB-д хадгалагдаж, галерейд бусад зурагтай хамт харагдана.

**Architecture:** `src/lib/localMaps.ts` нь IndexedDB-д файл + мэдээлэл хадгалж, бичлэгийг `AtlasItem` болгоно. `Atlas.tsx` локал зургуудыг manifest-ийн items-тэй нэгтгэнэ, тул одоогийн шүүлт/эрэмбэ/Viewer хэвээр ажиллана. `UploadDialog.tsx` нь toolbar-ын товчоор нээгдэх цонх.

**Tech Stack:** Next.js 16.4.6 (App Router, client components), React 19, TypeScript, CSS modules, IndexedDB, `node --test` (Node 24, TS type stripping).

**Spec:** `docs/superpowers/specs/2026-11-24-local-image-upload-design.md`

## Global Constraints

- Шинэ npm сан нэмэхгүй.
- Сервер талд юу ч хадгалахгүй, порталд оруулахгүй; зөвхөн хөтчийн IndexedDB.
- Зөвшөөрөх төрөл: `image/jpeg`, `image/png`, `image/webp`. Дээд хэмжээ 25MB (`25 * 1024 * 1024`).
- UI текст монгол (кирилл); одоогийн `Dashboard.module.css` / `Atlas.module.css` загвар, `Icon` компонентыг ашиглана.
- `AGENTS.md`: Next.js-ийн API ашиглахаас өмнө `node_modules/next/dist/docs/`-ийг шалгана (энд зөвхөн client React, шинэ Next API ашиглахгүй).

## Review Focus

- IndexedDB байхгүй/хаалттай (private цонх): `listLocalMaps` хоосон массив буцааж, атлас эвдрэхгүй; оруулах үед алдааны мессеж харагдана.
- Object URL-ууд устгах/дахин ачаалах үед `URL.revokeObjectURL`-аар чөлөөлөгдөнө (санах ой гоожихгүй).
- Порталь ачаалагдаагүй (manifest алдаа) үед ч оруулах товч ажиллах ёсгүй — topics хоосон тул товчийг `manifest` ирэх хүртэл disabled.
- Нэг дор олон файл сонгоход нэг нь буруу төрөл байвал: буруу файлыг алгасаж, бусдыг оруулж, алгассан файлын нэрийг харуулна.
- Аюул горимд аюулт үзэгдэл заавал (null биш); Эмзэг/Өртөх горимд "Бүх аюул" → `hazard: null`.

---

### Task 1: `localMaps` сан (хадгалах + хувиргах)

**Files:**
- Create: `src/lib/localMaps.ts`
- Modify: `src/lib/atlas.ts` (`AtlasItem`-д `local?: boolean`)
- Modify: `package.json` (`"test": "node --test tests/"`)
- Modify: `tsconfig.json` (`"exclude"`-д `"tests"` нэмэх)
- Test: `tests/localMaps.test.ts`

**Interfaces:**
- Produces:
  - `type LocalMapMeta = { title: string; kind: "hz" | "vul" | "exp"; topic: string; hazard: string | null; scope: string }`
  - `type LocalMapRecord = LocalMapMeta & { id: string; file: string; blob: Blob; modified: number }`
  - `const MAX_BYTES: number`, `const ACCEPT: string[]`
  - `checkFile(f: { type: string; size: number }): string | null` — алдааны текст эсвэл null
  - `toAtlasItem(r: Omit<LocalMapRecord, "blob">, url: string): AtlasItem`
  - `listLocalMaps(): Promise<LocalMapRecord[]>`
  - `addLocalMap(meta: LocalMapMeta, file: File): Promise<LocalMapRecord>`
  - `deleteLocalMap(id: string): Promise<void>`

- [ ] **Step 1: Write the failing test** (`tests/localMaps.test.ts`, `import { checkFile, toAtlasItem, MAX_BYTES } from "../src/lib/localMaps.ts"`)

```ts
test("checkFile", () => {
  assert.equal(checkFile({ type: "image/png", size: 1000 }), null);
  assert.equal(checkFile({ type: "application/pdf", size: 10 }), "Зөвхөн JPG, PNG, WebP зураг оруулна.");
  assert.equal(checkFile({ type: "image/jpeg", size: MAX_BYTES + 1 }), "Файл 25MB-аас их байна.");
});
test("toAtlasItem", () => {
  const it = toAtlasItem({ id: "local-1", file: "a.png", title: "A", kind: "hz",
    topic: "hazards", hazard: "wf", scope: "MN", modified: 5 }, "blob:x");
  assert.deepEqual(
    { id: it.id, img: it.img, thumb: it.thumb, lang: it.lang, mn: it.mn, en: it.en, local: it.local, unit: it.unit },
    { id: "local-1", img: "blob:x", thumb: "blob:x", lang: "mn", mn: true, en: false, local: true, unit: null });
});
```

- [ ] **Step 2:** `npm test` → FAIL (module not found).
- [ ] **Step 3:** `src/lib/localMaps.ts`-ийг хэрэгжүүлэх. `atlas.ts`-ээс зөвхөн `import type`. IndexedDB: db `nema-atlas`, version 1, store `maps` (keyPath `id`). `id = "local-" + crypto.randomUUID()`. `indexedDB` байхгүй/алдаа → `listLocalMaps` `[]` буцаана; `addLocalMap` алдаа шиднэ.
- [ ] **Step 4:** `npm test` → PASS; `npx tsc --noEmit` → алдаагүй.
- [ ] **Step 5: Commit** — `git add src/lib/localMaps.ts src/lib/atlas.ts tests package.json tsconfig.json && git commit -m "feat: local map storage in IndexedDB"`

### Task 2: Локал зургийг галерейд нэгтгэх, устгах

**Files:**
- Modify: `src/components/Atlas.tsx`
- Modify: `src/components/Gallery.tsx`
- Modify: `src/components/Atlas.module.css`

**Interfaces:**
- Consumes: `listLocalMaps`, `deleteLocalMap`, `toAtlasItem` (Task 1)
- Produces: `Atlas` дотор `addLocal(records: LocalMapRecord[]): void` (Task 3-ын dialog дуудна); `Gallery` шинэ prop `onDelete: (id: string) => void`

- [ ] **Step 1:** `Atlas.tsx`: mount үед `listLocalMaps()` → state `local: { rec: LocalMapRecord; item: AtlasItem }[]` (URL = `URL.createObjectURL(rec.blob)`); unmount үед бүгдийг revoke. `base` useMemo-д `manifest.items`-ийн оронд `[...manifest.items, ...local.map(l => l.item)]`. Устгахад `deleteLocalMap` → revoke → state-ээс хасах → `setOpen(null)`.
- [ ] **Step 2:** `Gallery.tsx`: `item.local` үед thumb дээр "Таны оруулсан" тэмдэг, картын буланд устгах товч (`Icon name="close"`, `aria-label="Устгах"`, `e.stopPropagation()` — Viewer нээгдэхгүй). Карт нь `<button>` тул устгах товчийг `<li>` дотор картын хажууд (sibling) байрлуулж absolute-аар буланд гаргана (button дотор button хориотой).
- [ ] **Step 3:** Шалгах: `npx tsc --noEmit && npm run lint` → алдаагүй. Хөтчийн консолоос IndexedDB-д нэг бичлэг гараар нэмэхгүй — Task 3-ын дараа гараар шалгана.
- [ ] **Step 4: Commit** — `git commit -am "feat: show and delete local maps in gallery"`

### Task 3: Оруулах цонх

**Files:**
- Create: `src/components/UploadDialog.tsx`
- Modify: `src/components/Atlas.tsx` (toolbar товч, dialog render)
- Modify: `src/components/Atlas.module.css`, `src/components/Dashboard.module.css` (toolbar grid-д нэг багана)
- Modify: `src/lib/iconPaths.ts` (`upload: "M12 21V9m-5 5 5-5 5 5M4 3h16"`)

**Interfaces:**
- Consumes: `addLocalMap`, `checkFile`, `ACCEPT`, `LocalMapRecord` (Task 1); `addLocal` (Task 2); `MODES`, `HAZARDS`, `AtlasTopic`
- Produces: `UploadDialog({ topics, aimags, initial, onDone, onClose })` — `topics: AtlasTopic[]` (manifest-ийн бүх topic), `aimags: Record<string,string>`, `initial: { mode: Mode; topic: string; hazard: string; scope: string }`, `onDone: (recs: LocalMapRecord[]) => void`

- [ ] **Step 1:** Toolbar-т "Зураг оруулах" товч (`dash.headerReset` загвар, `Icon name="upload"`), "Хамрах хүрээ" ба "Цэвэрлэх"-ийн хооронд; `manifest` null үед disabled.
- [ ] **Step 2:** `UploadDialog`: `<input type="file" multiple accept={ACCEPT.join(",")}>`, гарчиг (нэг файл үед файлын нэр өргөтгөлгүй; олон файл үед гарчгийн талбар нуугдаж файл бүр өөрийн нэрээр), үзүүлэлт segmented (`MODES`), элемент `<select>` (горимд таарах topics, `matchesMode`), аюулт үзэгдэл `<select>` (hz горимд `mh`-гүй жагсаалт, "Бүх аюул" сонголтгүй; бусад горимд "Бүх аюул" = null), хамрах хүрээ `<select>` (Улсын хэмжээ = `MN` + 22 аймаг). `initial`-аар урьдчилан бөглөнө (`scope` нь `all`/`aimag` бол `MN`; hz горимд `hazard === "all"` бол `wf`). Esc / Болих → `onClose`.
- [ ] **Step 3:** "Оруулах": файл бүрийг `checkFile`; буруу файлуудын нэр + шалтгааныг цонхонд жагсаана; зөвийг `addLocalMap` (hz горимд `topic: "hazards"`, `kind: "hz"`); амжилттай бол `onDone(recs)` → Atlas `addLocal` + шүүлтүүрийг оруулсан зургийн mode/topic/hazard/scope руу шилжүүлж харагдуулна; бүгд алдаатай эсвэл IndexedDB алдаа бол цонх нээлттэй, мессеж харуулна.
- [ ] **Step 4:** Шалгах: `npm test && npx tsc --noEmit && npm run lint && npm run build` → бүгд амжилттай. http://localhost:3004 дээр: PNG оруулах → галерейд "Таны оруулсан" тэмдэгтэй гарна → дарвал Viewer-т нээгдэнэ → refresh хийхэд үлдэнэ → устгахад алга болно; PDF сонгоход алдааны мессеж.
- [ ] **Step 5: Commit** — `git commit -am "feat: upload maps from computer (local demo)"`
