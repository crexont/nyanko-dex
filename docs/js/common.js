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
// data = {
//   meta:{source, saveModified, gameVersion, catfood, importedAt, updatedAt},
//   cats:{ [id]: {form, level, plus, talents:{[abilityId]:lv}} },
//   inv:{ currency:{xp, np, catfood, normalTickets, rareTickets, platinumTickets, legendTickets},
//         items:{[아이템ID]: 개수}, orbs:{[본능옥ID]: 개수}, saveModified, updatedAt },   (v2.0~, 없을 수 있음)
//   plan:[ {id, step:"tf"|"ff"} ]                                                     (육성 계획)
// }
export const store = {
  data: load(),
  listeners: new Set(),
  owned(id) { return this.data?.cats[id]; },
  ensure() { if (!this.data) this.data = { meta: { source: "직접 입력" }, cats: {} }; return this.data; },
  ensureInv() {
    const d = this.ensure();
    d.inv ??= { currency: {}, items: {}, orbs: {} };
    return d.inv;
  },
  // silent: 저장만 하고 화면 다시 그리기는 생략 (입력칸에서 고칠 때 포커스가 날아가지 않게)
  persist(silent = false) {
    this.data.meta.updatedAt = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); }
    catch { toast("브라우저 저장에 실패했어요. [내보내기]로 백업해 두세요."); }
    if (!silent) this.changed();
  },
  reset() { this.data = null; try { localStorage.removeItem(KEY); } catch {} this.changed(); },
  changed() { this.listeners.forEach(fn => fn()); },
};
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.cats) return d; } catch {}
  return null;
}

// 세이브 JSON의 재화·재료 → inv. 추출 도구는 세이브 순서 그대로 내보내므로 gamedata의 순서표로 아이템 ID를 붙인다.
function invFromSave(d) {
  if (d.inv) return { ...d.inv };  // 냥코위키에서 내보낸 파일
  if (!d.currency && !d.catfruit) return null;  // v1.0 추출 도구로 만든 파일
  const items = {};
  (d.catfruit || []).forEach((n, i) => { const m = GD.matatabi?.[i]; if (m) items[m[0]] = n | 0; });
  (d.catseyes || []).forEach((n, i) => { const id = GD.catseyes?.[i]; if (id != null) items[id] = n | 0; });
  return { currency: { ...(d.currency || { xp: d.xp, catfood: d.catfood }) }, items, orbs: { ...(d.orbs || {}) },
           saveModified: d.saveModified };
}

// 버튼 몇 개짜리 선택 창. 고른 값(취소면 null)을 돌려준다.
export function choose(message, buttons) {
  return new Promise(resolve => {
    const dlg = document.createElement("dialog");
    dlg.className = "choose";
    dlg.innerHTML = `<form method="dialog" class="dlg"><div class="dlg-body"><p>${message}</p></div>
      <div class="dlg-foot">${buttons.map(([v, label, cls]) => `<button class="btn ${cls || ""}" value="${v}">${label}</button>`).join("")}</div></form>`;
    document.body.appendChild(dlg);
    dlg.addEventListener("close", () => { resolve(dlg.returnValue && dlg.returnValue !== "cancel" ? dlg.returnValue : null); dlg.remove(); });
    dlg.showModal();
  });
}

export async function importJson(text) {
  let d;
  try { d = JSON.parse(text); } catch { return toast("JSON 파일이 아니에요."); }
  if (!Array.isArray(d.cats)) return toast("냥코위키 세이브 파일이 아니에요. 추출 도구가 만든 파일을 넣어 주세요.");
  const inv = invFromSave(d);
  const cur = store.data && Object.keys(store.data.cats).length;
  let mode = "all";
  if (cur) {
    mode = await choose(
      `이미 입력된 내 도감(${cur}마리)이 있어요. 무엇을 바꿀까요?<br><small>재화·재료만 바꾸면 직접 고친 캐릭 정보와 육성 계획은 그대로 남아요.</small>`,
      [["cancel", "취소"], ...(inv ? [["inv", "재화·재료만"]] : []), ["all", "전부 바꾸기", "primary"]]);
    if (!mode) return;
  }
  if (mode === "inv") {
    store.data.inv = { ...inv, updatedAt: new Date().toISOString() };
    store.persist();
    return toast("재화·재료를 갱신했어요.");
  }
  const cats = {};
  for (const c of d.cats) {
    const g = BYID.get(c.id); if (!g) continue;
    cats[c.id] = { form: clamp(c.form | 0, 0, g.forms.length - 1), level: clamp(c.level | 0, 1, g.maxLevel),
                   plus: clamp(c.plus | 0, 0, g.maxPlus), talents: pickTalents(g, c.talents || {}) };
  }
  // 육성 계획·본능옥 선택은 세이브에 없는 내 입력이라, 파일에 없으면 지금 것을 유지
  const plan = Array.isArray(d.plan) ? d.plan : (store.data?.plan || []);
  const orbEquip = d.orbEquip || store.data?.orbEquip || {};
  store.data = { meta: { source: d.source || "불러온 파일", saveModified: d.saveModified, gameVersion: d.gameVersion,
                         catfood: d.catfood, importedAt: new Date().toISOString() }, cats, plan, orbEquip };
  if (inv) store.data.inv = { ...inv, updatedAt: new Date().toISOString() };
  store.persist();
  toast(`${Object.keys(cats).length}마리${inv ? "와 재화·재료" : ""}를 불러왔어요.`);
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
    cats: Object.entries(d.cats).map(([id, c]) => ({ id: +id, ...c })),
    ...(d.inv ? { inv: d.inv } : {}), plan: d.plan || [], orbEquip: d.orbEquip || {} };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: "application/json" }));
  a.download = `냥코위키_내도감_${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---- 본능옥 ----
export const ORB_GRADE = ["D", "C", "B", "A", "S"];
// 본능옥 ID → { content, attr, grade, value, label }
export function orbInfo(id) {
  const o = GD.orbs?.list?.[id]; if (!o) return null;
  const [content, attr, grade, value] = o;
  const name = GD.orbs.names[content] ?? `본능옥 ${content}`;
  const trait = attr >= 0 ? GD.orbs.traits[attr] : null;
  return { content, attr, grade, value, trait, label: `${name}${trait ? `【${trait}】` : ""} ${ORB_GRADE[grade] ?? "?"}` };
}

// ---- 재료·진화 판정 ----
export const itemName = id => GD.items?.[id] ?? `아이템 ${id}`;
export const have = id => store.data?.inv?.items?.[id] ?? 0;
export const haveXp = () => store.data?.inv?.currency?.xp ?? 0;

// 다음 진화(3진 "tf" / 4진 "ff") 판정. 해당 진화가 없거나 아직 그 앞 단계가 아니면 null.
// { levelOk, known(재화 정보 있음), ok(지금 바로 가능), short:[[이름, 부족분]], cost, stageOnly(열매 진화가 아님) }
export function evoCheck(c, o, step) {
  const need = step === "tf" ? c.tfLevel : c.ffLevel, cost = step === "tf" ? c.tfCost : c.ffCost;
  if (need == null || !o || o.form !== (step === "tf" ? 1 : 2)) return null;
  const levelOk = !(need > 0) || o.level >= need;
  const known = !!store.data?.inv;
  if (!cost) return { levelOk, known, ok: false, short: [], cost: null, stageOnly: true };
  const short = [];
  if (known) {
    if (haveXp() < cost.xp) short.push(["경험치", cost.xp - haveXp()]);
    for (const [id, n] of cost.items) if (have(id) < n) short.push([itemName(id), n - have(id)]);
  }
  return { levelOk, known, ok: levelOk && known && !short.length, short, cost, stageOnly: false };
}

// 캐릭 하나 + 내 보유 상태를 화면용으로 묶는다
export function view(c) {
  const o = store.owned(c.id);
  const fi = o ? Math.min(o.form, c.forms.length - 1) : c.forms.length - 1;
  const talents = c.talents.map(t => ({ ...t, lv: o ? (o.talents?.[t.id] ?? 0) : 0 }));
  const traits = new Set(c.forms[fi].traits);
  for (const t of talents) if (t.trait && t.lv > 0) traits.add(t.trait);
  const maxLv = c.maxLevel + c.maxPlus;
  const tf = evoCheck(c, o, "tf"), ff = evoCheck(c, o, "ff");
  return { c, o, fi, talents, traits,
    lvTotal: o ? o.level + o.plus : 0, maxLv, tf, ff,
    tfTodo: !!tf?.levelOk, ffTodo: !!ff?.levelOk,   // 레벨 조건 충족
    tfReady: !!tf?.ok, ffReady: !!ff?.ok,            // 레벨 + 재료까지 충족 = 지금 바로 진화 가능
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
