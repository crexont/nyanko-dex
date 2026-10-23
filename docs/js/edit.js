// 내 보유 상태 수정 창 (내 도감·캐릭터 상세에서 함께 씀)
import { BYID, FORM, esc, clamp, icon, rarBadge, store, toast } from "./common.js";

const $ = id => document.getElementById(id);
let editing = null;

export function openEdit(id) {
  const c = BYID.get(id); if (!c) return;
  const o = store.owned(id);
  editing = c;
  const f0 = o ? o.form : 0, shown = o ? o.form : c.forms.length - 1;
  $("eHead").innerHTML = `${icon(c, shown)}<div><div class="name" id="eName">${esc(c.forms[shown].name)}</div><div class="sub">${rarBadge(c)}<span>#${c.id}</span></div></div>`;
  $("eOwn").checked = !!o;
  $("eForms").innerHTML = c.forms.map((f, i) =>
    `<label title="${esc(f.name)}"><input type="radio" name="form" value="${i}"${i === f0 ? " checked" : ""}>${FORM[i]} ${esc(f.name)}</label>`).join("");
  $("eLv").max = c.maxLevel; $("eLv").value = o ? o.level : 1;
  $("eLvMax").textContent = `/ ${c.maxLevel}`;
  $("ePlusWrap").hidden = !c.maxPlus;
  $("ePlus").max = c.maxPlus; $("ePlus").value = o ? o.plus : 0;
  $("ePlusMax").textContent = `/ ${c.maxPlus}`;
  $("eTalWrap").hidden = !c.talents.length;
  $("eTal").innerHTML = c.talents.map(t =>
    `<div class="trow"><span class="tn">${esc(t.name)}${t.ultra ? "<small>초본능</small>" : ""}</span>
      <input type="number" min="0" max="${t.max}" value="${o ? (o.talents?.[t.id] ?? 0) : 0}" data-tal="${t.id}" inputmode="numeric" aria-label="${esc(t.name)} 레벨"><span>/ ${t.max}</span></div>`).join("");
  syncOwn();
  $("edit").showModal();
}

function syncOwn() { $("eFields").disabled = !$("eOwn").checked; }

export function bindEdit() {
  $("eOwn").onchange = syncOwn;
  $("eForms").onchange = e => {
    const i = +e.target.value;
    $("eName").textContent = editing.forms[i].name;
    document.querySelector("#eHead img, #eHead .ph").outerHTML = icon(editing, i);
  };
  $("eLvMaxBtn").onclick = () => { $("eLv").value = editing.maxLevel; $("ePlus").value = editing.maxPlus; };
  $("eTalMax").onclick = () => document.querySelectorAll("#eTal input").forEach(i => i.value = i.max);
  $("eTalZero").onclick = () => document.querySelectorAll("#eTal input").forEach(i => i.value = 0);
  $("eCancel").onclick = () => $("edit").close();
  $("editForm").onsubmit = () => {
    const c = editing, d = store.ensure();
    if (!$("eOwn").checked) delete d.cats[c.id];
    else {
      const talents = {};
      document.querySelectorAll("#eTal input").forEach(i => { talents[i.dataset.tal] = clamp(parseInt(i.value) || 0, 0, +i.max); });
      d.cats[c.id] = {
        form: +(document.querySelector("#eForms input:checked")?.value ?? 0),
        level: clamp(parseInt($("eLv").value) || 1, 1, c.maxLevel),
        plus: clamp(parseInt($("ePlus").value) || 0, 0, c.maxPlus),
        talents };
    }
    store.persist(); toast("저장했어요.");
  };
}
