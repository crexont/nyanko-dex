"""게임 데이터(이름·레어도·본능·속성) + 아이콘을 앱용으로 빌드한다.

- CSV: BCSFE가 내려받은 한국판 게임 데이터 (없으면 자동 다운로드)
- 아이콘: 기기에서 꺼낸 *Server.pack 을 복호화해서 uni###_?00.png 추출

출력: docs/gamedata.js (window.GAMEDATA), docs/icons/<id>_<form>.png  (GitHub Pages 사이트용, 커밋한다)
사용: python tools/extract_vhdx.py --with-packs → python tools/build_gamedata.py [--version 15.6.0]
"""
from __future__ import annotations

import argparse
import glob
import hashlib
import json
import os
import re

from Crypto.Cipher import AES

from common import ROOT

DEFAULT_FILES = os.path.join(ROOT, "device")
SITE = os.path.join(ROOT, "docs")

RARITY = ["기본", "EX", "레어", "슈퍼레어", "울트라슈퍼레어", "레전드레어"]
# unitNNN.csv 의 타겟 속성 컬럼
TRAIT_COLS = {10: "빨강", 16: "떠있음", 17: "검정", 18: "메탈", 19: "무속성",
              20: "천사", 21: "에이리언", 22: "좀비", 78: "고대종", 96: "악마"}
# 본능 설명 "유효 타겟에 X를 추가" 의 X → 속성
TALENT_TRAIT = {"빨간 적": "빨강", "떠있는 적": "떠있음", "검은 적": "검정",
                "메탈 적": "메탈", "천사": "천사", "에이리언": "에이리언",
                "좀비": "좀비", "고대종": "고대종", "속성을 가지지 않는 적": "무속성",
                "악마": "악마"}
STAT_TALENT = {"체력 저하로 공격력": "공격력 업(체력 저하)", "기본 체력": "기본 체력 UP",
               "기본 공격력": "기본 공격력 UP", "이동 속도": "이동 속도 UP",
               "넉백 횟수": "넉백 횟수 UP", "생산 코스트": "생산 코스트 다운",
               "생산 스피드": "생산 스피드 UP", "공격 간격": "공격 간격 단축"}


def game_data_dir(version: str) -> tuple[str, str]:
    """(CSV 폴더, 실제로 받은 버전). 정확한 버전이 없으면 BCSFE가 가까운 버전을 고른다."""
    from bcsfe import core
    core.core_data.init_data()
    gdg = core.GameDataGetter(core.CountryCode.from_code("kr"),
                              core.GameVersion.from_string(version))
    if gdg.download("DataLocal", "unitbuy.csv") is None:
        raise SystemExit("게임 데이터 다운로드 실패")
    return str(gdg.get_version_path()), str(gdg.version)


def read(path: str) -> list[str]:
    with open(path, encoding="utf-8") as f:
        return f.read().splitlines()


def talent_name(desc: str) -> str:
    m = re.search(r"「([^」]+)」", desc)
    if m:
        return m[1].strip() + (" 강화" if "강화합니다" in desc.split("<br>")[0] else "")
    m = re.search(r"유효 타겟에 (.+?)(?:을|를) 추가", desc)
    if m:
        return f"타겟 추가: {m[1]}"
    for key, name in STAT_TALENT.items():
        if key in desc.split("<br>")[0]:
            return name
    return desc.split("<br>")[0]


def talent_trait(desc: str) -> str | None:
    m = re.search(r"유효 타겟에 (.+?)(?:을|를) 추가", desc)
    return TALENT_TRAIT.get(m[1]) if m else None


def extract_icons(files_dir: str, out_dir: str) -> set[tuple[int, int]]:
    """*Server.pack 에서 uni###_[fcsu]00.png 를 뽑는다. 뒤 팩이 앞 팩을 덮어씀."""
    list_key = hashlib.md5(b"pack").hexdigest()[:16].encode()
    pack_key = hashlib.md5(b"battlecats").hexdigest()[:16].encode()
    os.makedirs(out_dir, exist_ok=True)
    found: dict[tuple[int, int], tuple[str, int, int]] = {}
    for lst in sorted(glob.glob(os.path.join(files_dir, "*Server.list"))):
        raw = AES.new(list_key, AES.MODE_ECB).decrypt(open(lst, "rb").read())
        for line in raw[:-raw[-1]].decode("utf-8", "replace").splitlines()[1:]:
            name, off, size = line.split(",")[:3]
            m = re.fullmatch(r"uni(\d+)_([fcsu])00\.png", name)
            if m:
                found[(int(m[1]), "fcsu".index(m[2]))] = (lst[:-5] + ".pack", int(off), int(size))
    packs: dict[str, bytes] = {}
    for (cid, form), (pack, off, size) in found.items():
        if pack not in packs:
            packs[pack] = open(pack, "rb").read()
        seg = packs[pack][off:off + size]
        png = AES.new(pack_key, AES.MODE_ECB).decrypt(seg[:len(seg) // 16 * 16])
        end = png.find(b"IEND")
        with open(os.path.join(out_dir, f"{cid}_{form}.png"), "wb") as f:
            f.write(png[:end + 8] if end >= 0 else png)
    return set(found)


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--files", default=DEFAULT_FILES)
    ap.add_argument("--version", default="15.6.0")
    args = ap.parse_args(argv)

    G, data_version = game_data_dir(args.version)
    D, R = os.path.join(G, "DataLocal"), os.path.join(G, "resLocal")

    skill_desc = {}
    for line in read(os.path.join(R, "SkillDescriptions.csv"))[1:]:
        tid, text = line.split("|", 1)
        skill_desc[int(tid)] = text.strip()

    talents: dict[int, list[dict]] = {}
    for line in read(os.path.join(D, "SkillAcquisition.csv"))[1:]:
        r = [int(x) for x in line.split(",") if x.strip()]
        lst = []
        for i in range(2, len(r) - 13, 14):
            ability, max_lv, text_id, limit = r[i], r[i + 1], r[i + 10], r[i + 13]
            if not ability:
                continue
            desc = skill_desc.get(text_id, "")
            lst.append({"id": ability, "name": talent_name(desc), "max": max(max_lv, 1),
                        "ultra": limit == 1, "trait": talent_trait(desc)})
        talents[r[0]] = lst

    icons = extract_icons(args.files, os.path.join(SITE, "icons"))

    cats = []
    for cid, line in enumerate(read(os.path.join(D, "unitbuy.csv"))):
        ub = [int(x) for x in line.split("//")[0].split(",") if x.strip()]
        expl = os.path.join(R, f"Unit_Explanation{cid + 1}_ko.csv")
        stats = os.path.join(D, f"unit{cid + 1:03d}.csv")
        if not os.path.exists(expl) or not os.path.exists(stats):
            continue
        names = [l.split("|")[0].strip() for l in read(expl)]
        stat_rows = [l.split("//")[0].split(",") for l in read(stats) if l.strip()]
        forms = []
        for f, name in enumerate(names[:4]):
            if not name or f >= len(stat_rows):
                break
            row = stat_rows[f]
            traits = [t for c, t in TRAIT_COLS.items() if len(row) > c and row[c].strip() == "1"]
            forms.append({"name": name, "traits": traits, "icon": (cid, f) in icons})
        if not forms:
            continue
        cats.append({
            "id": cid,
            "rarity": ub[13],
            "forms": forms,
            "maxLevel": ub[50] or ub[19],
            "maxPlus": ub[51],
            # 진화 아이템 ID가 0이면 해당 진화 없음. 요구 레벨: 25/26열(열매 진화), 없으면 20열(기본캐릭), 0=스테이지 해금 등
            "tfLevel": max(ub[25], ub[20], 0) if len(forms) >= 3 and ub[23] > 0 else None,
            "ffLevel": max(ub[26], 0) if len(forms) >= 4 and ub[24] > 0 else None,
            "talents": talents.get(cid, []),
        })

    out = {"version": data_version, "builtFor": args.version, "rarities": RARITY, "traits": list(TRAIT_COLS.values()),
           "cats": cats}
    with open(os.path.join(SITE, "gamedata.js"), "w", encoding="utf-8") as f:
        f.write("window.GAMEDATA = ")
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"캐릭 {len(cats)}종, 아이콘 {len(icons)}개, 본능 보유 캐릭 {sum(1 for c in cats if c['talents'])}종")


if __name__ == "__main__":
    main()
