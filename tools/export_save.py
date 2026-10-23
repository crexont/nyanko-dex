"""세이브 파일을 읽기 전용으로 파싱해서 보유 캐릭 JSON을 만든다. 세이브는 수정하지 않는다.

사용: python tools/export_save.py [세이브 경로] [-o 출력.json]
기본: device/SAVE_DATA (extract_vhdx.py 가 꺼낸 것) → data/save.json
"""
from __future__ import annotations

import argparse
import datetime
import json
import os

from bcsfe import core

from common import ROOT

DEFAULT_SAVE = os.path.join(ROOT, "device", "SAVE_DATA")
DEFAULT_OUT = os.path.join(ROOT, "data", "save.json")


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("save", nargs="?", default=DEFAULT_SAVE)
    ap.add_argument("-o", "--out", default=DEFAULT_OUT)
    ap.add_argument("--js", help="웹앱이 자동으로 불러올 save.js 경로 (예: app/save.js)")
    args = ap.parse_args(argv)

    with open(args.save, "rb") as f:
        raw = f.read()
    s = core.SaveFile(core.Data(raw), core.CountryCode.from_code("kr"))

    cats = []
    for c in s.cats.cats:
        if not c.unlocked:
            continue
        cats.append({
            "id": c.id,
            "form": c.current_form,
            "level": c.upgrade.base + 1,
            "plus": c.upgrade.plus,
            "talents": {str(t.id): t.level for t in (c.talents or [])},
        })

    out = {
        "source": os.path.basename(args.save),
        "saveModified": datetime.datetime.fromtimestamp(os.path.getmtime(args.save)).isoformat(timespec="minutes"),
        "exportedAt": datetime.datetime.now().isoformat(timespec="minutes"),
        "gameVersion": s.game_version.to_string(),
        "catfood": s.catfood,
        "xp": s.xp,
        "cats": cats,
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    if args.js:
        with open(args.js, "w", encoding="utf-8") as f:
            f.write("window.SAVEDATA = ")
            json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
            f.write(";\n")

    forms = [sum(1 for c in cats if c["form"] == i) for i in range(4)]
    print(f"{out['source']} (v{out['gameVersion']}) → {args.out}")
    print(f"보유 {len(cats)}마리 (1진 {forms[0]} / 2진 {forms[1]} / 3진 {forms[2]} / 4진 {forms[3]}), "
          f"캣푸드 {s.catfood}, XP {s.xp}")


if __name__ == "__main__":
    main()
