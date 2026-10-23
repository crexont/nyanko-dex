# 냥코 도감 (NyankoDex)

냥코대전쟁(한국판)에서 **내가 가진 캐릭터의 진화 단계, 레벨, 본능 상태를 한눈에** 보고 필터·검색하는 개인용 도구입니다.

- 블루스택 5에 옮겨 둔 세이브를 **읽기만** 합니다. 세이브 수정이나 서버 업로드는 하지 않습니다.
- 모든 처리는 내 PC 안에서만 이뤄집니다. 내 세이브는 어디로도 전송되지 않습니다.
- PONOS와 관계없는 비공식 팬 도구입니다. 사용 책임은 본인에게 있습니다.

## 기능

- 보유 캐릭 목록: 아이콘, 이름(진화 단계별), 레어도, 진화 단계, 레벨+플러스, 본능 레벨
- 필터
  - 보유 / 미보유 / 전체
  - 할 일: 3진 가능·미진화, 4진 가능·미진화, 본능 미해방, 본능 미완료, 레벨 미만렙
  - 레어도별, 속성(빨강·떠있음·검정·메탈·천사·에이리언·좀비·고대종·악마·무속성) 상대
- 이름 검색(1·2·3진 이름 모두), 정렬(ID·레어도·레벨)

## 사용법 (Windows)

준비물: **블루스택 5**만 있으면 됩니다. Python이나 7-Zip은 따로 설치하지 않아도 됩니다.

1. [Releases](../../releases)에서 `NyankoDex-<버전>-win64.zip`을 받아 원하는 폴더에 압축을 풉니다.
2. 블루스택 5에 냥코대전쟁(한국판)을 설치하고, 폰에서 발급한 **기종변경 코드**로 계정을 옮긴 뒤 게임을 한 번 실행합니다.
3. 블루스택을 **완전히 종료**합니다(작업 표시줄 트레이 아이콘까지).
4. `NyankoDex.exe`를 더블클릭합니다.
   - 세이브 추출 → 변환 → 브라우저에서 도감이 자동으로 열립니다.
   - 처음 실행할 때는 게임 데이터를 내려받느라 1~2분 걸립니다.
5. 다음부터 그냥 볼 때는 `app/index.html`만 열면 됩니다. 게임을 더 진행했다면 3~4번을 다시 하세요.

> **처음 실행할 때 "Windows의 PC 보호" 창이 뜨면** [추가 정보] → [실행]을 누르세요. 코드 서명을 하지 않은 개인 프로젝트라 뜨는 경고입니다.

### 계정을 폰으로 되돌릴 때

기종변경 코드는 한 번 쓰면 사라집니다. 블루스택에서 다시 기종변경 코드를 발급받아 폰에 입력하면 계정이 돌아갑니다. 이 과정은 게임의 정상 기능이며, 이 도구와는 관계없습니다.

## 동작 방식

1. 블루스택 인스턴스의 가상 디스크(`C:\ProgramData\BlueStacks_nxt\Engine\<인스턴스>\Data.vhdx`)에서 동봉된 7-Zip으로 아래 파일만 `device/` 폴더에 꺼냅니다.
   - `SAVE_DATA`
   - 캐릭 아이콘이 든 `*UnitServer.pack/.list`
   - 원본 가상 디스크는 읽기만 합니다.
2. [BCSFE](https://github.com/fieryhenry/BCSFE-Python)로 세이브를 파싱해 `data/save.json`을 만듭니다.
3. 캐릭 이름·레어도·본능 정보는 BCSFE를 통해 커뮤니티 게임 데이터 저장소([BCData](https://git.battlecatsmodding.org/fieryhenry/BCData))에서 받습니다. 아이콘은 내 기기에서 꺼낸 팩 파일에서 뽑습니다.
4. `app/index.html`이 위 데이터를 읽어 보여 줍니다. 다른 세이브 JSON은 파일을 끌어다 놓아 불러올 수도 있습니다.

인스턴스가 여러 개면 세이브가 가장 최근인 인스턴스를 고릅니다. 직접 지정하려면 명령 프롬프트에서 `NyankoDex.exe --instance Pie64`처럼 실행하세요.

## 문제 해결

| 증상 | 해결 |
|---|---|
| "블루스택이 실행 중입니다" | 블루스택을 트레이 아이콘까지 완전히 종료한 뒤 다시 실행 |
| "블루스택 5 인스턴스를 찾지 못했습니다" | 블루스택 5가 설치돼 있는지 확인 (블루스택 4 이하는 미지원) |
| "세이브가 있는 인스턴스가 없습니다" | 블루스택에서 냥코(한국판)를 실행해 계정을 옮긴 뒤 종료하고 재시도 |
| 백신이 exe를 막음 | PyInstaller로 만든 exe에서 생기는 오탐입니다. 아래 "소스로 실행"을 쓰거나 예외 처리 |
| 새 캐릭이 안 보임 | 게임 업데이트 후 커뮤니티 데이터가 아직 갱신되지 않았을 수 있습니다 |

## 개발자용

### 소스로 실행

Python 3.9 이상과 7-Zip이 필요합니다.

```bat
update.bat
```

`update.bat`은 Python을 찾아 `requirements.txt`를 설치한 뒤 `tools/update.py`를 실행합니다. 각 단계를 따로 실행할 수도 있습니다.

| 스크립트 | 역할 |
|---|---|
| `tools/extract_vhdx.py` | Data.vhdx → `device/` |
| `tools/export_save.py [세이브]` | 세이브 → `data/save.json` (`--js app/save.js`로 웹앱 자동 로드용 출력) |
| `tools/build_gamedata.py --version 15.6.0` | 게임 데이터 + 아이콘 → `app/gamedata.js`, `app/icons/` |
| `tools/package.py --version v0.1.0` | 배포용 zip 빌드 (PyInstaller 필요) |

### 릴리즈

`v`로 시작하는 태그를 푸시하면 GitHub Actions(`.github/workflows/release.yml`)가 Windows에서 exe를 빌드해 Releases에 zip을 올립니다.

```bash
git tag v0.1.0
git push origin v0.1.0
```

### 저장소에 올리지 않는 것

개인 세이브(`device/`, `data/`, `app/save.js`)와 게임 리소스(`app/gamedata.js`, `app/icons/`)는 `.gitignore`로 제외합니다. 게임 리소스는 각자 PC에서 생성되며 저장소나 릴리즈에 포함하지 않습니다.

## 크레딧

- [BCSFE-Python](https://github.com/fieryhenry/BCSFE-Python): 세이브 파싱, 게임 데이터 다운로드
- [7-Zip](https://www.7-zip.org): 가상 디스크 읽기. 배포판에 `7z.exe`, `7z.dll`을 동봉하며 라이선스는 `7z/License.txt`를 따릅니다.
- 냥코대전쟁의 캐릭터, 이름, 이미지의 권리는 © PONOS Corporation에 있습니다.
