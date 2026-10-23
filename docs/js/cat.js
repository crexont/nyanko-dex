// 캐릭터 상세 — 진화 단계별 스탯·능력·본능·진화 재료 + 내 보유 상태
import { BYID, FORM, esc, clamp, icon, rarBadge, traitChips, view, store } from "./common.js";
import { openEdit } from "./edit.js";

let unitsPromise;
const loadUnits = () => unitsPromise ??= fetch("data/units.json").then(r => {
  if (!r.ok) throw new Error(r.status);
  return r.json();
});

const state = { id: null, form: null, level: null, plus: null };

export function renderCat(root, id) {
  const c = BYID.get(id);
  if (!c) { root.innerHTML = `<div class="empty">캐릭터를 찾을 수 없어요. <a href="#/cats">캐릭터 목록으로</a></div>`; return; }
  if (state.id !== id) Object.assign(state, { id, form: null, level: null, plus: null });
  root.innerHTML = `<div class="empty">불러오는 중…</div>`;
  const draw = () => loadUnits().then(units => paint(root, c, units[id]))
    .catch(() => { root.innerHTML = `<div class="empty">캐릭터 데이터를 불러오지 못했어요. 새로고침해 주세요.</div>`; });
  draw();
  return draw;
}

const sec = frames => { const s = (frames / 30).toFixed(2).replace(/\.?0+$/, ""); return `${s}초`; };
const num = n => Math.floor(n).toLocaleString();

// 레벨 배율: 레벨이 1 오를 때마다 기본값의 curve[(레벨)/10]% 만큼 오른다 (unitlevel.csv)
function levelMult(curve, total) {
  let m = 1;
  for (let l = 1; l < total; l++) m += (curve[Math.min(Math.floor(l / 10), curve.length - 1)] ?? 0) / 100;
  return m;
}
const TREASURE = 2.5;  // 보물 최대

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
    default: return k;
  }
}

function paint(root, c, u) {
  if (!u) { root.innerHTML = `<div class="empty">이 캐릭터의 상세 데이터가 없어요.</div>`; return; }
  const v = view(c), o = v.o;
  const fi = state.form ?? (o ? Math.min(o.form, c.forms.length - 1) : c.forms.length - 1);
  const lv = state.level ?? (o ? o.level : Math.min(30, c.maxLevel));
  const plus = state.plus ?? (o ? o.plus : 0);
  const f = c.forms[fi], s = u.forms[fi];
  const mult = levelMult(u.curve, lv + plus);
  const stat = base => num(base * mult * TREASURE);
  const hits = s.atk.map(a => Math.floor(a * mult * TREASURE));
  const total = hits.reduce((a, b) => a + b, 0);
  const ld = s.ld && (() => { const a = s.ld[0], b = s.ld[0] + s.ld[1]; return `${Math.min(a, b)}~${Math.max(a, b)}`; })();

  const abil = s.ab.map(a => `<li>${esc(abilityText(a, f.traits))}</li>`);
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
          <div class="stat-table">
            <div><small>체력</small><b>${stat(s.hp)}</b></div>
            <div><small>공격력${hits.length > 1 ? " (합계)" : ""}</small><b>${num(total)}</b>${hits.length > 1 ? `<small>${hits.map(num).join(" + ")}</small>` : ""}</div>
            <div><small>사거리</small><b>${s.range}</b></div>
            <div><small>공격 범위</small><b>${s.area ? "범위" : "단일"}</b></div>
            <div><small>공격 발생</small><b>${sec(s.pre[0])}</b></div>
            <div><small>공격 간격(대기)</small><b>${sec(s.tba * 2)}</b></div>
            <div><small>이동 속도</small><b>${s.speed}</b></div>
            <div><small>넉백</small><b>${s.kb}<span>회</span></b></div>
            <div><small>생산 코스트</small><b>${num(s.cost * 1.5)}<span>원</span></b></div>
            <div><small>재생산</small><b>${sec(s.respawn * 2)}</b></div>
          </div>
          <p class="note">체력·공격력은 보물 최대 기준이에요. 본능 스탯 보너스, 연구력에 따른 재생산 단축은 반영하지 않았어요. 공격 간격은 공격 모션 시간을 뺀 대기 시간이에요.</p>
        </div>
        <div class="panel">
          <h2>타겟 속성 · 능력</h2>
          ${f.traits.length ? traitChips(f.traits) : `<p class="note" style="margin:0">타겟 속성 없음</p>`}
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
