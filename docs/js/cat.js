// 캐릭터 상세 — 진화 단계별 스탯·능력·본능·진화 재료 + 내 보유 상태
import { BYID, FORM, esc, clamp, icon, rarBadge, traitChips, view, store } from "./common.js";
import { openEdit } from "./edit.js";

let unitsPromise;
const loadUnits = () => unitsPromise ??= fetch("data/units.json").then(r => {
  if (!r.ok) throw new Error(r.status);
  return r.json();
});

const state = { id: null, form: null, level: null, plus: null, tal: null };

export function renderCat(root, id) {
  const c = BYID.get(id);
  if (!c) { root.innerHTML = `<div class="empty">캐릭터를 찾을 수 없어요. <a href="#/cats">캐릭터 목록으로</a></div>`; return; }
  if (state.id !== id) Object.assign(state, { id, form: null, level: null, plus: null, tal: null });
  root.innerHTML = `<div class="empty">불러오는 중…</div>`;
  const draw = () => loadUnits().then(units => paint(root, c, units[id]))
    .catch(() => { root.innerHTML = `<div class="empty">캐릭터 데이터를 불러오지 못했어요. 새로고침해 주세요.</div>`; });
  draw();
  return draw;
}

const sec = frames => { const s = (frames / 30).toFixed(2).replace(/\.?0+$/, ""); return `${s}초`; };
const num = n => Math.floor(n).toLocaleString();

// 레벨 배율: 레벨이 1 오를 때마다 기본값의 curve[(레벨)/10]% 만큼 오른다 (unitlevel.csv)
// 게임과 같은 반올림·버림 순서를 위해 BCU(util/unit/UnitLevel.getMult, battle/entity/Entity, AtkModelEntity)를
// 그대로 따른다. 레벨 배율은 Java float(32비트)로 계산되므로 Math.fround로 맞춘다.
const f32 = Math.fround;
function levelMult(curve, total) {
  let dec = total, d = f32(1 - f32((curve[0] ?? 0) * f32(0.01)));
  for (const mul of curve) {
    if (dec >= 10) { d = f32(d + f32(mul * f32(0.1))); dec -= 10; }
    else { d = f32(d + f32(mul * dec * f32(0.01))); break; }
  }
  return d;
}
const TREASURE = f32(2.5);  // 보물 최대 (1 + 300×0.005)
// 체력: trunc( trunc( round(기본×레벨) × 보물 ) × 본능 )
const calcHp = (base, mult, talentPct) => Math.trunc(Math.trunc(f32(Math.round(f32(base * mult)) * TREASURE)) * (1 + talentPct * 0.01));
// 공격력(한 타): trunc( 본능 × trunc( round(기본×레벨) × 보물 ) )
const calcAtk = (base, mult, talentPct) => Math.trunc((1 + talentPct * 0.01) * Math.trunc(f32(Math.round(f32(base * mult)) * TREASURE)));

function abilityText(a, traits) {
  const [k, v, x, y, z] = a, to = traits.length ? `${traits.join("·")}에게 ` : "";
  switch (k) {
    case "strong": return `${to}엄청 강하다`;
    case "resist": return `${to}맷집이 좋다`;
    case "massive": return `${to}초 데미지`;
    case "tough": return `${to}초 맷집`;
    case "only": return `공격 타겟 한정 (${traits.join("·") || "지정 속성"}만 공격)`;
    case "kb": return `${to}날려버린다 (${v}%)`;
    case "freeze": return `${to}움직임을 멈춘다 (${v}%, ${sec(x)})`;
    case "slow": return `${to}움직임을 느리게 한다 (${v}%, ${sec(x)})`;
    case "weaken": return `${to}공격력 다운 (${v}%, ${sec(x)}, 공격력 ${y}%로)`;
    case "curse": return `${to}저주 (${v}%, ${sec(x)})`;
    case "dodge": return `${to}공격 무효 (${v}%, ${sec(x)})`;
    case "crit": return `크리티컬 (${v}%)`;
    case "money": return "격파 시 머니 UP";
    case "base": return "성 파괴 특기";
    case "wave": return `파동 공격 (${v}%, Lv${x})`;
    case "miniWave": return `소파동 (${v}%, Lv${x})`;
    case "surge": return `열파 (${v}%, Lv${z})`;
    case "miniSurge": return `소열파 (${v}%, Lv${z})`;
    case "strengthen": return `체력 ${v}% 이하에서 공격력 +${x}%`;
    case "survive": return `살아남는다 (${v}%)`;
    case "metal": return "메탈 (크리티컬 외 데미지 1)";
    case "immWave": return "파동 데미지 무효";
    case "waveBlock": return "파동 스톱퍼 (적의 파동을 없앤다)";
    case "immKb": return "날려버린다 무효";
    case "immFreeze": return "움직임을 멈춘다 무효";
    case "immSlow": return "움직임을 느리게 한다 무효";
    case "immWeaken": return "공격력 다운 무효";
    case "zombie": return "좀비 킬러";
    case "witch": return "마녀 킬러";
    case "barrier": return `베리어 브레이커 (${v}%)`;
    case "shield": return `쉴드 브레이커 (${v}%)`;
    case "savage": return `혼신의 일격 (${v}%, 공격력 +${x}%)`;
    case "colossus": return "초생명체 특효";
    case "behemoth": return "초수 특효";
    case "sage": return "초현자 특효";
    case "metalKiller": return `메탈 킬러 (현재 체력의 ${v}%)`;
    case "explosion": return `폭파 공격 (${v}%)`;
    case "conjure": return "소환";
    case "soul": return "영혼 공격";
    case "counterSurge": return "열파 카운터";
    case "immWarp": return "워프 무효";
    case "immCurse": return "고대의 저주 무효";
    case "immToxic": return "독 데미지 무효";
    case "immSurge": return "열파 데미지 무효";
    case "immBlast": return "폭파 데미지 무효";
    default:
      if (k.startsWith("res:")) return `${k.slice(4)} 내성 (${v}% 감소)`;
      return k;
  }
}

// ---- 본능 효과 ----
// 계산 방식은 BCU(오픈소스 시뮬레이터)의 PCoin과 같다:
// 레벨 L 값 = (최대-최소)×(L-1)/(최대레벨-1) + 최소 (정수 버림), 최대 레벨이 1 이하면 최대값.
function talentMods(vals, lv) {
  const maxLv = Math.max(vals[0], 1), m = [];
  for (let j = 0; j < 4; j++) {
    const v0 = vals[1 + j * 2], v1 = vals[2 + j * 2];
    m.push(maxLv > 1 ? Math.trunc((v1 - v0) * (lv - 1) / (maxLv - 1)) + v0 : v1);
  }
  return m;
}
const TAL_TRAIT = { 33: "빨강", 34: "떠있음", 35: "검정", 36: "메탈", 37: "천사", 38: "에이리언", 39: "좀비", 40: "고대종", 41: "무속성", 57: "악마" };
const TAL_FLAG = { 4: "only", 5: "strong", 6: "resist", 7: "massive", 12: "base", 14: "zombie", 16: "money", 23: "waveBlock",
                   59: "soul", 63: "colossus", 66: "sage", 68: "counterSurge",
                   44: "immWeaken", 45: "immFreeze", 46: "immSlow", 47: "immKb", 48: "immWave", 49: "immWarp",
                   29: "immCurse", 53: "immToxic", 55: "immSurge", 69: "immBlast" };
const TAL_RES = { 18: "공격력 다운", 19: "움직임을 멈춘다", 20: "움직임을 느리게 한다", 21: "날려버린다", 22: "파동 데미지",
                  24: "워프", 30: "고대의 저주", 52: "독 데미지", 54: "열파 데미지" };
// 확률형 능력: [능력 키, 새로 생길 때의 값]. 원래 있던 능력이면 각 값에 더한다 (열파류는 덮어씀).
const TAL_PROC = {
  1: ["weaken", m => [m[0], m[1], 100 - m[2]]], 2: ["freeze", m => [m[0], m[1]]], 3: ["slow", m => [m[0], m[1]]],
  8: ["kb", m => [m[0]]], 10: ["strengthen", m => [100 - m[0], m[1]]], 11: ["survive", m => [m[0]]],
  13: ["crit", m => [m[0]]], 15: ["barrier", m => [m[0]]], 17: ["wave", m => [m[0], m[1]]],
  50: ["savage", m => [m[0], m[1]]], 51: ["dodge", m => [m[0], m[1]]], 56: ["surge", m => [m[0], 0, 0, m[1]]],
  58: ["shield", m => [m[0]]], 60: ["curse", m => [m[0], m[1]]], 62: ["miniWave", m => [m[0], m[1]]],
  64: ["behemoth", m => [1, m[0], m[1]]], 65: ["miniSurge", m => [m[0], 0, 0, m[1]]], 67: ["explosion", m => [m[0], m[1]]],
};

function applyTalents(c, u, s, levels) {
  const out = { hp: 0, atk: 0, speed: 0, kb: 0, cost: 0, cd: 0, tba: 0, traits: [], ab: s.ab.map(a => [...a]), touched: new Set() };
  for (const t of c.talents) {
    const L = levels[t.id] || 0, vals = u.talentVals?.[t.id];
    if (!L || !vals) continue;
    const m = talentMods(vals, L), id = t.id;
    if (id === 32) out.hp += m[0];
    else if (id === 31) out.atk += m[0];
    else if (id === 27) out.speed += m[0];
    else if (id === 28) out.kb += m[0];
    else if (id === 25) out.cost += m[0];
    else if (id === 26) out.cd += m[0];
    else if (id === 61) out.tba += m[0];
    else if (TAL_TRAIT[id]) out.traits.push(TAL_TRAIT[id]);
    else if (TAL_FLAG[id]) {
      const k = TAL_FLAG[id];
      if (!out.ab.some(a => a[0] === k)) out.ab.push([k, 1]);
      out.touched.add(k);
    } else if (TAL_RES[id]) {
      const k = "res:" + TAL_RES[id];
      out.ab.push([k, m[0]]); out.touched.add(k);
    } else if (TAL_PROC[id]) {
      const [k, make] = TAL_PROC[id], cur = out.ab.find(a => a[0] === k);
      if (!cur) out.ab.push([k, ...make(m)]);
      else if (k === "surge" || k === "miniSurge") { cur[1] = m[0]; cur[4] = m[1]; }
      else if (k === "weaken") { cur[1] += m[0]; cur[2] += m[1]; }
      else m.forEach((x, j) => { if (x > 0 && cur.length > 1 + j) cur[1 + j] += x; });
      out.touched.add(k);
    }
  }
  return out;
}

function paint(root, c, u) {
  if (!u) { root.innerHTML = `<div class="empty">이 캐릭터의 상세 데이터가 없어요.</div>`; return; }
  const v = view(c), o = v.o;
  const fi = state.form ?? (o ? Math.min(o.form, c.forms.length - 1) : c.forms.length - 1);
  const lv = state.level ?? (o ? o.level : Math.min(30, c.maxLevel));
  const plus = state.plus ?? (o ? o.plus : 0);
  const f = c.forms[fi], s = u.forms[fi];

  // 본능: 3진(진화 3단계)부터 적용. 미적용 / 내 본능 / 전부 최대
  const talOk = c.talents.length > 0 && fi >= 2;
  const mode = talOk ? (state.tal ?? (o ? "mine" : "none")) : "none";
  const levels = mode === "max" ? Object.fromEntries(c.talents.map(t => [t.id, t.max]))
    : mode === "mine" && o ? (o.talents || {}) : {};
  const T = applyTalents(c, u, s, levels);

  const mult = levelMult(u.curve, lv + plus);
  const hp = calcHp(s.hp, mult, T.hp);
  const hits = s.atk.map(a => calcAtk(a, mult, T.atk));
  const total = hits.reduce((a, b) => a + b, 0);
  const speed = s.speed + T.speed, kb = s.kb + T.kb, cost = (s.cost - T.cost) * 1.5;
  const respawnF = s.respawn * 2 - T.cd, tbaF = Math.trunc(s.tba * (100 - T.tba) / 100) * 2;
  const ld = s.ld && (() => { const a = s.ld[0], b = s.ld[0] + s.ld[1]; return `${Math.min(a, b)}~${Math.max(a, b)}`; })();
  const up = (on, why) => on ? ` class="up" title="본능: ${why}"` : "";

  const traits = [...new Set([...f.traits, ...T.traits])];

  // 상황별 공격력 (본능 반영 후 능력 기준). 배율: 엄청 강하다 ×1.8 · 초 데미지 ×4 (보물 최대), 크리티컬 ×2
  const abOf = k => T.ab.find(a => a[0] === k);
  const toT = traits.length ? traits.join("·") : "대상 속성";
  const cond = [
    abOf("strengthen") && [`공격력 업 (체력 ${abOf("strengthen")[1]}% 이하, +${abOf("strengthen")[2]}%)`, 1 + abOf("strengthen")[2] / 100],
    abOf("strong") && [`${toT}에게 (엄청 강하다, ×1.8)`, 1.8],
    abOf("massive") && [`${toT}에게 (초 데미지, ×4)`, 4],
    abOf("savage") && [`혼신의 일격 발동 (${abOf("savage")[1]}%, +${abOf("savage")[2]}%)`, 1 + abOf("savage")[2] / 100],
    abOf("crit") && [`크리티컬 발동 (${abOf("crit")[1]}%, ×2)`, 2],
  ].filter(Boolean);
  const abil = T.ab.map(a => `<li${T.touched.has(a[0]) ? ` class="tal-ab"` : ""}>${esc(abilityText(a, traits))}${T.touched.has(a[0]) ? "<em>본능</em>" : ""}</li>`);
  if (s.area) abil.unshift("<li>범위 공격</li>");
  if (ld) abil.unshift(`<li>원거리 공격 (${ld})</li>`);
  if (s.atk.length > 1) abil.push(`<li>${s.atk.length}회 연속 공격</li>`);

  const evo = (title, e, need) => e || need != null ? `<div class="panel"><h2>${title}</h2><dl class="kv">
      ${need != null ? `<dt>필요 레벨</dt><dd>${need > 0 ? `Lv ${need}` : "특정 스테이지 클리어"}</dd>` : ""}
      ${e?.xp ? `<dt>경험치</dt><dd>${num(e.xp)} XP</dd>` : ""}
      ${e?.items?.length ? `<dt>재료</dt><dd>${e.items.map(([n, k]) => `${esc(n)} ×${k}`).join("<br>")}</dd>` : ""}
    </dl></div>` : "";

  const mine = o ? `<dl class="kv">
        <dt>진화</dt><dd>${FORM[o.form]} · ${esc(c.forms[Math.min(o.form, c.forms.length - 1)].name)}</dd>
        <dt>레벨</dt><dd>Lv ${o.level}${o.plus ? ` +${o.plus}` : ""} <span class="lvmax">/ ${c.maxLevel}${c.maxPlus ? "+" + c.maxPlus : ""}</span></dd>
        ${c.talents.length ? `<dt>본능</dt><dd>${v.talents.map(t => `${esc(t.name)} ${t.lv}/${t.max}`).join("<br>")}</dd>` : ""}
      </dl><div><button class="btn" data-edit>수정</button></div>`
    : `<p class="note" style="margin:0 0 10px">아직 내 도감에 없는 캐릭터예요.</p><div><button class="btn primary" data-edit>보유로 추가</button></div>`;

  root.innerHTML = `
    <p class="crumb"><a href="#/">냥코위키</a><i>/</i><a href="#/cats">캐릭터</a><i>/</i><span>${esc(c.forms[c.forms.length - 1].name)}</span></p>
    <section class="detail-head">
      ${icon(c, fi)}
      <div>
        <div class="badges">${rarBadge(c)}<span class="cid">#${c.id}</span>${o ? `<span class="tag own">보유 · ${FORM[o.form]}</span>` : ""}</div>
        <h1>${esc(f.name)}</h1>
        <div class="sub">${c.forms.map((x, i) => i === fi ? `<b>${esc(x.name)}</b>` : esc(x.name)).join(" → ")}</div>
        ${u.desc[fi] ? `<p class="desc">${esc(u.desc[fi])}</p>` : ""}
      </div>
    </section>
    <div class="formtabs" role="group" aria-label="진화 단계">${c.forms.map((x, i) =>
      `<button data-form="${i}" aria-pressed="${i === fi}">${icon(c, i)}${FORM[i]}</button>`).join("")}</div>
    <div class="cols">
      <div>
        <div class="panel">
          <h2>스탯 <span class="ctl">Lv <input type="number" id="sLv" min="1" max="${c.maxLevel}" value="${lv}">
            ${c.maxPlus ? `+ <input type="number" id="sPlus" min="0" max="${c.maxPlus}" value="${plus}">` : ""}</span></h2>
          ${c.talents.length ? (talOk ? `<div class="seg" role="group" aria-label="본능 적용">${[["none", "본능 미적용"], ...(o ? [["mine", "내 본능"]] : []), ["max", "본능 전부 최대"]]
              .map(([k, l]) => `<button data-tal="${k}" aria-pressed="${mode === k}">${l}</button>`).join("")}</div>`
            : `<p class="note" style="margin:0 0 10px">본능은 3진부터 적용돼요.</p>`) : ""}
          <div class="stat-table">
            <div${up(T.hp, `체력 +${T.hp}%`)}><small>체력</small><b>${num(hp)}</b></div>
            <div${up(T.atk, `공격력 +${T.atk}%`)}><small>공격력${hits.length > 1 ? " (합계)" : ""}</small><b>${num(total)}</b>${hits.length > 1 ? `<small>${hits.map(num).join(" + ")}</small>` : ""}</div>
            <div><small>사거리</small><b>${s.range}</b></div>
            <div><small>공격 범위</small><b>${s.area ? "범위" : "단일"}</b></div>
            <div><small>공격 발생</small><b>${sec(s.pre[0])}</b></div>
            <div${up(T.tba, `공격 간격 -${T.tba}%`)}><small>공격 간격(대기)</small><b>${sec(tbaF)}</b></div>
            <div${up(T.speed, `이동 속도 +${T.speed}`)}><small>이동 속도</small><b>${speed}</b></div>
            <div${up(T.kb, `넉백 +${T.kb}회`)}><small>넉백</small><b>${kb}<span>회</span></b></div>
            <div${up(T.cost, `코스트 -${num(T.cost * 1.5)}원`)}><small>생산 코스트</small><b>${num(cost)}<span>원</span></b></div>
            <div${up(T.cd, `재생산 -${sec(T.cd)}`)}><small>재생산</small><b>${sec(respawnF)}</b></div>
          </div>
          ${cond.length ? `<div class="cond"><small>상황별 공격력${hits.length > 1 ? " (합계)" : ""}</small>${cond.map(([label, x]) =>
            `<div><span>${esc(label)}</span><b>${num(total * x)}</b></div>`).join("")}</div>` : ""}
          <p class="note">체력·공격력은 보물 최대 기준이에요. ${talOk && mode !== "none" ? "주황색 칸은 본능으로 바뀐 값이에요. " : ""}연구력에 따른 재생산 단축은 반영하지 않았어요. 공격 간격은 공격 모션 시간을 뺀 대기 시간이에요.</p>
        </div>
        <div class="panel">
          <h2>타겟 속성 · 능력</h2>
          ${traits.length ? traitChips(traits) : `<p class="note" style="margin:0">타겟 속성 없음</p>`}
          <ul class="ab-list" style="margin-top:10px">${abil.length ? abil.join("") : `<li class="none">특수 능력 없음</li>`}</ul>
        </div>
        ${c.talents.length ? `<div class="panel"><h2>본능</h2><div class="tal-list">${c.talents.map(t =>
          `<div class="tal${t.ultra ? " u" : ""}"><b>${esc(t.name)}</b><small>${t.ultra ? "초본능 · " : ""}최대 Lv${t.max}</small>
            ${u.talentDesc[t.id] ? `<p>${esc(u.talentDesc[t.id])}</p>` : ""}</div>`).join("")}</div></div>` : ""}
      </div>
      <div>
        <div class="panel mine"><h2>내 보유 상태</h2>${mine}</div>
        ${c.forms.length >= 3 ? evo("3진 진화", u.tf, c.tfLevel) : ""}
        ${c.forms.length >= 4 ? evo("4진 진화", u.ff, c.ffLevel) : ""}
        <div class="panel"><h2>기본 정보</h2><dl class="kv">
          <dt>레어도</dt><dd>${rarBadge(c)}</dd>
          <dt>최대 레벨</dt><dd>${c.maxLevel}${c.maxPlus ? ` + ${c.maxPlus}` : ""}</dd>
          <dt>진화 단계</dt><dd>${c.forms.length}단계</dd>
        </dl></div>
      </div>
    </div>`;

  document.title = `${f.name} - 냥코위키`;
  root.querySelectorAll("[data-form]").forEach(b => b.onclick = () => { state.form = +b.dataset.form; paint(root, c, u); });
  root.querySelectorAll("[data-tal]").forEach(b => b.onclick = () => { state.tal = b.dataset.tal; paint(root, c, u); });
  const onLv = () => {
    state.level = clamp(parseInt(root.querySelector("#sLv").value) || 1, 1, c.maxLevel);
    state.plus = c.maxPlus ? clamp(parseInt(root.querySelector("#sPlus").value) || 0, 0, c.maxPlus) : 0;
    paint(root, c, u);
    root.querySelector("#sLv").focus();
  };
  root.querySelector("#sLv").onchange = onLv;
  root.querySelector("#sPlus")?.addEventListener("change", onLv);
  root.querySelector("[data-edit]").onclick = () => openEdit(c.id);
}
