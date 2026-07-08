# PalBoard

🥚 팰월드(Palworld) 보유 팰 관리 + 교배 시뮬레이터 데스크탑 앱

Windows / macOS / Linux에서 **설치 없이 실행 가능**한 개인용 팰 관리 도구입니다. 모든 데이터는 본인 PC 안에만 저장되며 인터넷 연결도 필요 없습니다.

> Next.js + TypeScript + Tailwind + React Flow + Electron 으로 만들어졌습니다.

---

## 📥 다운로드 및 실행

[**Releases 페이지**](https://github.com/yujin2625/PalBoard/releases)에서 OS에 맞는 파일을 받으세요.

### Windows

두 가지 중 편한 거 받으시면 됩니다:

| 파일 | 설치 | 사용 방식 |
| --- | --- | --- |
| `PalBoard Setup x.y.z.exe` | 설치 마법사 | 시작 메뉴 / 바탕화면 바로가기 자동 생성 |
| `PalBoard x.y.z.exe` (portable) | 설치 안 함 | 더블클릭하면 바로 실행 (USB에 넣고 다녀도 OK) |

### macOS / Linux

| OS | 파일 | 사용 |
| --- | --- | --- |
| Linux | `PalBoard-x.y.z.AppImage` | 실행 권한 부여 후 더블클릭 (`chmod +x` 한 번) |
| macOS | `PalBoard-x.y.z.dmg` | 드래그&드롭으로 Applications에 복사 |

> ℹ️ Node.js나 다른 의존성을 설치할 필요 없습니다. 다운로드 → 실행 끝.

> ⚠️ 코드 서명이 없는 빌드라 첫 실행 시 Windows/Mac에서 "확인되지 않은 게시자" 경고가 뜰 수 있습니다. (Windows: 자세히 → 실행 / macOS: 우클릭 → 열기)

---

## ✨ 기능

### 1. 보유 팰 관리
- **월드(서버) 단위로 그룹**해서 관리. 월드 탭으로 빠른 전환
- 종/별명/성별/레벨/패시브(최대 4개)/IV 등록·수정·삭제
- 다중 선택 일괄 삭제
- 이름·별명·패시브 검색, 정렬(등록순/이름순/레벨순)
- JSON 내보내기·불러오기로 백업/공유

#### 팰 자동 가져오기 (수동 입력 없이 한 번에)
- 💾 **세이브 파일에서** — 솔플이거나 내가 연 서버라면, Palworld 세이브(`Level.sav`)를
  읽어 **종·성별·레벨·패시브·IV·별명까지 통째로** 등록. 세이브 자동 탐지(Windows),
  여러 플레이어가 있으면 골라서 등록. *(데스크탑 앱 전용)*
- 🎮 **게임에서 (UE4SS 모드)** — 남의 서버에 **게스트로 접속**할 땐 세이브가 호스트에
  있어 못 읽습니다. 내 클라이언트에 모드([`mod/PalBoardExport`](mod/))를 설치하면
  게임에서 내 팰을 뽑아 등록할 수 있어요. 여러 플레이어가 섞인 서버에선 **내 플레이어
  UID로 자동 필터**. 설치·사용법은 [`mod/README.md`](mod/README.md) 참고.
- 🖼 **이미지로** — 팰 박스 스크린샷에서 아이콘 인식 (종·성별)

### 2. 교배 시뮬레이션
- 두 부모 선택 → **자식 종**, **성별 확률**, **패시브 상속 확률** 즉시 계산
- **역추적**: 목표 팰을 정하면 그 팰을 만드는 모든 부모 조합 표시 (수천 건도 즉시)

### 3. 경로 찾기
- 보유 팰들 만으로 **목표 팰까지의 최단 교배 경로** 계산 (BFS, 최대 5스텝)
- 도달 불가 시 → 어떤 팰을 추가로 잡으면 가능한지 추천
- 도달 가능해도 → 어떤 팰을 더 잡으면 경로가 짧아지는지 추천

### 4. 교배 트리 화이트보드
- 좌측 팔레트의 팰을 드래그&드롭으로 보드에 배치
- 부모 노드의 연결점을 빈 공간으로 드래그하면 **자식 노드가 자동 생성**되고 연결됨
- 두 부모 → 한 자식 트리를 다단(3-step 이상)으로 쌓을 수 있음
- 표시 패시브 수(top-N)를 1~8로 조절
- 같은 성별 부모 조합은 **교배 불가**로 표시
- 자식 노드를 **보유 팰로 즉시 등록** 가능
- 보드 단위 JSON 내보내기/불러오기 (참조된 팰 데이터도 함께 임베드)
- Alt + 클릭으로 노드/연결선 빠른 삭제

### 5. 유전 정보
- BP 평균 공식, 동종 한정 팰, 타워 보스 오버라이드 등 위키 룰 정리
- 패시브/액티브 스킬/IV 상속 PMF 표
- 현재 게임 버전과 데이터 가져온 날짜 명시

### 기타
- **한국어 / 영어 토글** — 우상단 버튼으로 즉시 전환. 팰 이름, 패시브 이름 모두 따라 바뀜
- **우상단 ⚙ 설정** — 내 플레이어 UID(가져오기 필터용) 관리, 데이터 전체 초기화
- 패시브 뱃지는 위키 공식 스타일(랭크별 그라데이션 + 아이콘) 그대로 사용

---

## 💾 데이터 위치 / 백업

모든 데이터는 **앱 안의 브라우저 저장소(localStorage)**에 들어 있어 본 PC를 떠나지 않습니다.

다른 컴퓨터로 옮기거나 백업하려면:
1. **보유 팰 페이지** 우측 상단 → `내보내기` → JSON 파일 받기 (월드 + 팰 + 보드 전부 포함)
2. 새 PC에서 같은 앱 실행 → `불러오기` → 받은 JSON 선택

화이트보드만 따로 공유하고 싶다면 화이트보드 페이지의 `보드 내보내기` 사용.

---

## 🛠 개발자용

직접 빌드하거나 코드를 수정하려면:

```bash
git clone https://github.com/yujin2625/PalBoard.git
cd PalBoard
npm install
```

### 개발

```bash
npm run dev              # http://localhost:3000  (브라우저)
npm run electron:dev     # 데스크탑 창으로 띄워 확인
```

### 빌드

```bash
# 웹 정적 빌드 (out/ 에 떨어짐)
npm run export

# 데스크탑 앱 패키지 (release/ 에 떨어짐)
npm run dist:win         # Windows: NSIS 설치형 + 포터블 EXE
npm run dist:linux       # Linux: AppImage
npm run dist:mac         # macOS: .dmg (Mac 머신에서만 가능)
npm run dist             # win + linux 동시
```

### 데이터 갱신

게임 패치로 팰/교배표가 바뀌면 다음 명령으로 데이터를 다시 받아 빌드합니다.

```bash
# 팰 메타 + 교배 페어 매핑 (palcalc)
curl -L -o tmp/palcalc-db.json       https://raw.githubusercontent.com/tylercamp/palcalc/master/PalCalc.Model/db.json
curl -L -o tmp/palcalc-breeding.json https://raw.githubusercontent.com/tylercamp/palcalc/master/PalCalc.Model/breeding.json

# 위키의 정식 Paldeck 라벨
curl -L -A "PalBoard/1.0" -o tmp/cargo-pal-full.json \
  "https://palworld.wiki.gg/api.php?action=cargoquery&tables=Pal&fields=_pageName=page,palName,paldeckNumber,palSize&limit=500&order_by=paldeckNumber&format=json"

# 패시브 정보
curl -L -A "PalBoard/1.0" -o tmp/passives.json \
  "https://palworld.wiki.gg/api.php?action=cargoquery&tables=PassiveSkill&fields=_pageName=page,passiveSkillName,rank,description&limit=500&format=json"

# 패시브 한국어 이름 (paldb.cc)
curl -L -A "Mozilla/5.0" -o tmp/paldb-passives-en.html "https://paldb.cc/en/Passive_Skills"
curl -L -A "Mozilla/5.0" -o tmp/paldb-passives.html    "https://paldb.cc/ko/Passive_Skills"

# 가져오기용 패시브 내부코드→이름 매핑 (KrisCris/Palworld-Pal-Editor)
curl -L -o tmp/kriscris-passives.json \
  "https://raw.githubusercontent.com/KrisCris/Palworld-Pal-Editor/develop/src/palworld_pal_editor/assets/data/pal_passives.json"

# 빌드
node scripts/build-data.mjs           # pals.json + breeding.json
node scripts/build-passives.mjs       # passives.json (한국어 매핑 포함)
node scripts/build-passive-codes.mjs  # passive-codes.json (내부코드→이름, 세이브/모드 가져오기용)
node scripts/download-icons.mjs       # public/pals/ 아이콘 갱신 (incremental)
```

### 디렉토리 구조

```
src/
  app/                    # Next.js App Router 페이지 (/, /sim, /path, /board, /info)
  components/             # 공용 UI (PalPicker, PassiveBadge, Settings, ...)
    SaveImport.tsx        # 세이브 파일 가져오기 UI
    board/                # 화이트보드용 노드 컴포넌트
  lib/                    # 비즈니스 로직
    breeding.ts           # combine, parentsOf, shortestPath, 패시브 상속 확률
    pal-data.ts           # 팰 데이터 로드 & 인덱싱
    mod-import.ts         # 세이브/모드 → 보유 팰 매핑 (종·패시브·성별·IV, UID 필터)
    electron.ts           # 렌더러용 Electron 브리지 타입
    settings.ts           # 저장 설정 (내 플레이어 UID)
    board-store.ts        # 화이트보드 영속 저장
    board-compute.ts      # 보드 트리 → 자식 해석
    i18n.tsx              # 한/영 사전 + 토글
    passives.ts, storage.ts, types.ts
  data/                   # 빌드 산출 정적 데이터 (pals, breeding, passives, passive-codes, meta)
electron/
  main.cjs                # 데스크탑 셸 (고정 포트 정적 서버 + BrowserWindow)
  preload.cjs             # 렌더러↔메인 IPC 브리지
  save-parse.mjs          # 세이브 파싱 (메인 프로세스, Node)
  vendor/                 # 세이브 파서 — uesave WASM + ooz + gvas-pals (팰 맵 디코드)
mod/
  PalBoardExport/         # UE4SS 팰 내보내기 모드 (게스트 서버용)
public/
  pals/                   # 팰 아이콘 227개
  passives/               # 패시브 뱃지 자산 (위키 미러)
scripts/                  # 데이터 갱신 + parse-save.mjs (세이브 파서 CLI 테스트)
```

---

## 📊 데이터 출처

이 앱은 다음 공개 자료를 사용합니다. 게임 자체에 속한 그래픽 자원(팰 아이콘 등)의 권리는 Pocketpair Inc.에 있습니다.

| 출처 | 용도 |
| --- | --- |
| [tylercamp/palcalc](https://github.com/tylercamp/palcalc) | 팰 메타 + 교배 페어 매핑(25,879건) |
| [palworld.wiki.gg](https://palworld.wiki.gg) | 유전 시스템 룰, Paldeck, 팰 아이콘, 패시브 데이터/뱃지 스타일 |
| [paldb.cc](https://paldb.cc) | 패시브 한국어 이름 |
| [iebb/PalworldSaveEditor](https://github.com/iebb/PalworldSaveEditor) | 세이브 파서 (uesave WASM + ooz 압축 해제) — MIT |
| [KrisCris/Palworld-Pal-Editor](https://github.com/KrisCris/Palworld-Pal-Editor) | 패시브 내부코드→이름 매핑 |
| [UE4SS](https://github.com/UE4SS-RE/RE-UE4SS) | 게임에서 가져오기 모드 실행 기반 |

데이터 버전과 가져온 날짜는 [src/data/meta.json](src/data/meta.json)과 앱 내 `유전 정보` 페이지에서 확인할 수 있습니다.

---

## 📜 라이선스

이 프로젝트의 코드는 MIT 라이선스로 자유롭게 사용 가능합니다. 다만 위 표의 외부 데이터/자산은 각자의 라이선스를 따릅니다.

Palworld는 Pocketpair Inc.의 등록 상표입니다. 이 프로젝트는 비공식 팬 도구입니다.
