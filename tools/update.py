"""원클릭 갱신: 블루스택 Data.vhdx 추출 → (필요하면) 게임데이터 빌드 → 세이브 JSON → 웹앱 열기
배포판 exe(NyankoDex.exe)의 진입점이기도 하다.

사용: python tools/update.py [--instance Pie64] [--no-extract] [--no-open]
"""
import argparse
import glob
import json
import os
import sys

import build_gamedata
import export_save
import extract_vhdx
from common import FROZEN, ROOT

DEVICE = os.path.join(ROOT, "device")
GAMEDATA = os.path.join(ROOT, "app", "gamedata.js")


def log(msg: str) -> None:
    print(msg, flush=True)


def built_for() -> str | None:
    """현재 gamedata.js 가 어느 게임 버전용으로 빌드됐는지."""
    try:
        with open(GAMEDATA, encoding="utf-8") as f:
            return json.loads(f.read().split("=", 1)[1].rstrip().rstrip(";")).get("builtFor")
    except (OSError, ValueError, IndexError):
        return None


def packs_newer() -> bool:
    packs = glob.glob(os.path.join(DEVICE, "*Server.pack"))
    return bool(packs) and max(map(os.path.getmtime, packs)) > os.path.getmtime(GAMEDATA)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--instance")
    ap.add_argument("--no-extract", action="store_true", help="device/ 에 이미 있는 파일 사용")
    ap.add_argument("--no-open", action="store_true")
    args = ap.parse_args()

    if not args.no_extract:
        log("[1/3] 블루스택에서 세이브 추출")
        extract_vhdx.main(["--instance", args.instance] if args.instance else [])

    log("[2/3] 세이브 → JSON")
    export_save.main(["--js", os.path.join(ROOT, "app", "save.js")])
    with open(os.path.join(ROOT, "data", "save.json"), encoding="utf-8") as f:
        version = json.load(f)["gameVersion"]

    if built_for() != version or packs_newer():
        log(f"[3/3] 게임 데이터 빌드 (v{version}) - 처음엔 다운로드 때문에 1~2분 걸립니다")
        build_gamedata.main(["--version", version])
    else:
        log(f"[3/3] 게임 데이터 최신 (v{version})")

    if not args.no_open:
        os.startfile(os.path.join(ROOT, "app", "index.html"))
        log("완료! 브라우저에서 도감이 열립니다.")


def run() -> int:
    # 콘솔이 cp949 여도 한글·기호 출력에서 죽지 않게
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass
    code = 0
    try:
        main()
    except SystemExit as e:
        if e.code not in (0, None):
            if isinstance(e.code, str):
                print(f"\n오류: {e.code}", file=sys.stderr)
            code = 1
    except Exception as e:  # exe 창이 바로 닫히지 않게 내용을 보여준다
        import traceback
        traceback.print_exc()
        print(f"\n예상치 못한 오류: {e}", file=sys.stderr)
        code = 1
    if FROZEN and code:
        try:
            input("\n엔터를 누르면 창이 닫힙니다...")
        except EOFError:
            pass
    return code


if __name__ == "__main__":
    sys.exit(run())
