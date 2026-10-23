"""배포용 zip 만들기: PyInstaller(onedir) + 7-Zip 동봉 + 웹앱.

사용: python tools/package.py [--version v0.1.0] [--7zip "C:\\Program Files\\7-Zip"]
결과: build/NyankoDex-<version>-win64.zip
  NyankoDex/
    NyankoDex.exe, _internal/   (Python + bcsfe 포함)
    7z/7z.exe, 7z.dll, License.txt
    app/index.html
    사용법.txt, LICENSE.txt
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build")
NAME = "NyankoDex"

HOWTO = """냥코 도감 (비공식, 읽기 전용)

1. 블루스택 5에서 냥코대전쟁(한국판)에 계정을 옮기고 게임을 한 번 실행합니다.
2. 블루스택을 완전히 종료합니다 (트레이 아이콘까지).
3. NyankoDex.exe 를 더블클릭합니다.
   → 세이브 추출 → 변환 → 브라우저에서 도감이 열립니다.

처음 실행할 때 "Windows의 PC 보호" 창이 뜨면 [추가 정보] → [실행]을 누르세요.
다시 볼 때는 app/index.html 을 열면 됩니다.

자세한 설명·소스 코드: https://github.com/{repo}
라이선스: GPL-3.0 (LICENSE.txt). 동봉된 7-Zip은 7z/License.txt 를 따릅니다.
"""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", default="dev")
    ap.add_argument("--7zip", dest="sevenzip", default=os.path.join(os.environ.get("ProgramFiles", r"C:\Program Files"), "7-Zip"))
    ap.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", "<owner>/<repo>"))
    args = ap.parse_args()

    for f in ("7z.exe", "7z.dll", "License.txt"):
        if not os.path.isfile(os.path.join(args.sevenzip, f)):
            sys.exit(f"7-Zip 파일 없음: {os.path.join(args.sevenzip, f)}")

    shutil.rmtree(BUILD, ignore_errors=True)
    subprocess.run([sys.executable, "-m", "PyInstaller", "--noconfirm", "--onedir", "--console",
                    "--name", NAME, "--collect-all", "bcsfe",
                    "--paths", os.path.join(ROOT, "tools"),
                    "--distpath", os.path.join(BUILD, "dist"), "--workpath", os.path.join(BUILD, "work"),
                    "--specpath", BUILD, os.path.join(ROOT, "tools", "update.py")], check=True)

    out = os.path.join(BUILD, "dist", NAME)
    os.makedirs(os.path.join(out, "7z"))
    for f in ("7z.exe", "7z.dll", "License.txt"):
        shutil.copy2(os.path.join(args.sevenzip, f), os.path.join(out, "7z", f))
    os.makedirs(os.path.join(out, "app"))
    shutil.copy2(os.path.join(ROOT, "app", "index.html"), os.path.join(out, "app", "index.html"))
    shutil.copy2(os.path.join(ROOT, "LICENSE"), os.path.join(out, "LICENSE.txt"))
    with open(os.path.join(out, "사용법.txt"), "w", encoding="utf-8-sig") as f:
        f.write(HOWTO.format(repo=args.repo))

    zip_base = os.path.join(BUILD, f"{NAME}-{args.version}-win64")
    shutil.make_archive(zip_base, "zip", os.path.join(BUILD, "dist"), NAME)
    print(f"완료: {zip_base}.zip ({os.path.getsize(zip_base + '.zip') // 1024 // 1024} MB)")


if __name__ == "__main__":
    main()
