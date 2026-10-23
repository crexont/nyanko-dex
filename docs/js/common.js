// 냥코위키 — 공통: 게임 데이터, 내 도감 저장소, 작은 화면 조각들
export const GD = window.GAMEDATA;
export const BYID = new Map(GD.cats.map(c => [c.id, c]));
export const FORM = ["1진", "2진", "3진", "4진"];
const RCOL = ["--r0", "--r1", "--r2", "--r3", "--r4", "--r5"];
export const RELEASES = "https://github.com/crexont/nyanko-wiki/releases/latest";
const KEY = "nyanko-wiki.v1";

export const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));

export function icon(c, fi) {
  for (let f = fi; f >= 0; f--) if (c.forms[f].icon) return `<img loading="lazy" src="icons/${c.id}_${f}.png" alt="">`;
  return `<div class="ph">#${c.id}</div>`;
}
export const rarBadge = c => `<span class="rar" style="background:var(${RCOL[c.rarity] || "--r0"})">${GD.rarities[c.rarity] || "?"}</span>`;
export const traitChips = traits => traits.size || traits.length
  ? `<div class="traits">${[...traits].map(t => `<span class="tr" style="--c:var(--tr-${t})">${t}</span>`).join("")}</div>` : "";

let toastTimer;
export function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

// ---- 내 도감 저장 (이 브라우저의 localStorage) ----
// data = { meta:{source, saveModified, gameVersion, catfood, importedAt, updatedAt}, cats:{ [id]: {form, level, plus, talents:{[abilityId]:lv}} } }
export const store = {
  data: load(),
  listeners: new Set(),
  owned(id) { return this.data?.cats[id]; },
  ensure() { if (!this.data) this.data = { meta: { source: "직접 입력" }, cats: {} }; return this.data; },
  persist() {
    this.data.meta.updatedAt = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); }
    catch { toast("브라우저 저장에 실패했어요. [내보내기]로 백업해 두세요."); }
    this.changed();
  },
  reset() { this.data = null; try { localStorage.removeItem(KEY); } catch {} this.changed(); },
  changed() { this.listeners.forEach(fn => fn()); },
};
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.cats) return d; } catch {}
  return null;
}

export function importJson(text) {
  let d;
  try { d = JSON.parse(text); } catch { return toast("JSON 파일이 아니에요."); }
  if (!Array.isArray(d.cats)) return toast("냥코위키 세이브 파일이 아니에요. 추출 도구가 만든 파일을 넣어 주세요.");
  const cur = store.data && Object.keys(store.data.cats).length;
  if (cur && !confirm(`지금 입력된 ${cur}마리 데이터를 이 파일 내용으로 바꿀까요?\n(직접 수정한 내용도 사라집니다)`)) return;
  const cats = {};
  for (const c of d.cats) {
    const g = BYID.get(c.id); if (!g) continue;
    cats[c.id] = { form: clamp(c.form | 0, 0, g.forms.length - 1), level: clamp(c.level | 0, 1, g.maxLevel),
                   plus: clamp(c.plus | 0, 0, g.maxPlus), talents: pickTalents(g, c.talents || {}) };
  }
  store.data = { meta: { source: d.source || "불러온 파일", saveModified: d.saveModified, gameVersion: d.gameVersion,
                         catfood: d.catfood, importedAt: new Date().toISOString() }, cats };
  store.persist();
  toast(`${Object.keys(cats).length}마리를 불러왔어요.`);
}
function pickTalents(g, src) {
  const t = {};
  for (const s of g.talents) t[s.id] = clamp((src[s.id] ?? src[String(s.id)] ?? 0) | 0, 0, s.max);
  return t;
}
export function exportJson() {
  const d = store.data;
  if (!d) return toast("내보낼 데이터가 없어요.");
  const out = { source: "NyankoWiki", exportedAt: new Date().toISOString(), saveModified: d.meta.saveModified,
    gameVersion: d.meta.gameVersion, catfood: d.meta.catfood,
    cats: Object.entries(d.cats).map(([id, c]) => ({ id: +id, ...c })) };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: "application/json" }));
  a.download = `냥코위키_내도감_${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// 캐릭 하나 + 내 보유 상태를 화면용으로 묶는다
export function view(c) {
  const o = store.owned(c.id);
  const fi = o ? Math.min(o.form, c.forms.length - 1) : c.forms.length - 1;
  const talents = c.talents.map(t => ({ ...t, lv: o ? (o.talents?.[t.id] ?? 0) : 0 }));
  const traits = new Set(c.forms[fi].traits);
  for (const t of talents) if (t.trait && t.lv > 0) traits.add(t.trait);
  const maxLv = c.maxLevel + c.maxPlus;
  return { c, o, fi, talents, traits,
    lvTotal: o ? o.level + o.plus : 0, maxLv,
    tfTodo: !!o && c.tfLevel != null && o.form === 1 && o.level >= c.tfLevel,
    ffTodo: !!o && c.ffLevel != null && o.form === 2 && o.level >= c.ffLevel,
    talentNone: !!o && talents.length > 0 && talents.some(t => t.lv === 0),
    talentPart: !!o && talents.length > 0 && talents.some(t => t.lv < t.max) };
}

// 칩 줄 (필터)
export function chips(row, items, isOn, onClick) {
  row.querySelectorAll("button").forEach(b => b.remove());
  for (const [val, label] of items) {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = label;
    b.setAttribute("aria-pressed", isOn(val));
    b.onclick = () => onClick(val);
    row.appendChild(b);
  }
}
export const toggle = (set, v) => set.has(v) ? set.delete(v) : set.add(v);

// 세이브 파일 열기·끌어다 놓기 (어느 페이지에서든)
export function bindImport() {
  document.addEventListener("change", e => {
    if (e.target.matches("[data-import]") && e.target.files[0]) { e.target.files[0].text().then(importJson); e.target.value = ""; }
  });
  let depth = 0;
  addEventListener("dragenter", e => { e.preventDefault(); depth++; document.body.classList.add("dragging"); });
  addEventListener("dragleave", () => { if (--depth <= 0) { depth = 0; document.body.classList.remove("dragging"); } });
  addEventListener("dragover", e => e.preventDefault());
  addEventListener("drop", e => {
    e.preventDefault(); depth = 0; document.body.classList.remove("dragging");
    const f = e.dataTransfer.files[0]; if (f) f.text().then(importJson);
  });
}
