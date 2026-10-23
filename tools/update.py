"""추출 도구(NyankoDex.exe)의 진입점.
블루스택 Data.vhdx 추출 → 냥코_세이브.json 저장 → 도감 사이트 열기 + 파일 위치 보여주기

사용: python tools/update.py [--instance Pie64] [--no-extract] [--no-open]
"""
import argparse
import os
import subprocess
import sys

import export_save
import extract_vhdx
from common import FROZEN, ROOT

SITE_URL = "https://crexont.github.io/nyanko-dex/"
OUT = os.path.join(ROOT, "냥코_세이브.json")


def log(msg: str) -> None:
    print(msg, flush=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--instance")
    ap.add_argument("--no-extract", action="store_true", help="device/ 에 이미 있는 파일 사용")
    ap.add_argument("--no-open", action="store_true")
    args = ap.parse_args()

    if not args.no_extract:
        log("[1/2] 블루스택에서 세이브 추출")
        extract_vhdx.main(["--instance", args.instance] if args.instance else [])

    log("[2/2] 세이브 → 냥코_세이브.json")
    export_save.main(["-o", OUT])

    log("\n완료! 도감 사이트에서 [세이브 불러오기]로 이 파일을 열거나 끌어다 놓으세요:")
    log(f"  {OUT}")
    if not args.no_open:
        os.startfile(SITE_URL)  # https 주소라 .html 연결 프로그램과 상관없이 기본 브라우저로 열린다
        subprocess.Popen(["explorer", "/select,", OUT])  # 파일을 바로 끌어다 놓을 수 있게 탐색기에서 표시


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
