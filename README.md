# PalBoard

팰월드(Palworld) 보유 팰 관리 + 교배 시뮬레이터 웹앱. Next.js + TypeScript + Tailwind.

## 기능 (MVP)

- **보유 팰**: 월드별 등록/삭제(다중선택), 검색·정렬, JSON 내보내기/불러오기 — localStorage 저장.
- **교배 시뮬**: 두 부모 → 자식 종 + 성별 확률 + 패시브 상속 확률. 자식으로부터 부모 조합 역추적.
- **경로 찾기**: 보유 팰 종 기준 목표 팰까지의 최단 교배 경로 (최대 깊이 1~5). 도달 불가 시 필요한 팰 추천, 도달 가능해도 더 짧게 만드는 팰 추천.
- **유전 정보**: BP 평균 공식, 패시브/액티브/IV 상속 룰, 동종 한정·타워 보스 오버라이드, 위키 버전.

## 데이터 출처

- [tylercamp/palcalc](https://github.com/tylercamp/palcalc) — `db.json`(팰 메타) + `breeding.json`(전체 페어→자식 매핑 25,879건)
- [palworld.wiki.gg/wiki/Breeding](https://palworld.wiki.gg/wiki/Breeding) — 유전 시스템 룰

데이터 버전과 가져온 날짜는 `src/data/meta.json`에 기록됩니다 (`/info` 페이지에도 노출).

## 개발

```
npm install
npm run dev      # http://localhost:3000
npm run build
```

### 데이터 갱신

```
mkdir -p tmp
curl -L https://raw.githubusercontent.com/tylercamp/palcalc/master/PalCalc.Model/db.json -o tmp/palcalc-db.json
curl -L https://raw.githubusercontent.com/tylercamp/palcalc/master/PalCalc.Model/breeding.json -o tmp/palcalc-breeding.json
node scripts/build-data.mjs
```

## 데스크탑 앱 패키징 (Electron)

웹 배포 대신 받는 사람이 더블클릭으로 실행할 수 있게:

```
npm run electron:dev     # 개발 중 데스크탑 창으로 띄워 확인
npm run dist:win         # release/ 에 Windows 설치 EXE + 포터블 EXE
npm run dist:linux       # release/ 에 Linux AppImage
npm run dist:mac         # macOS .dmg (Mac에서만 빌드 가능)
```

산출물 (Windows 예시):
- `release/PalBoard Setup 0.1.0.exe` — 설치형 (NSIS, ~183 MB)
- `release/PalBoard 0.1.0.exe` — 포터블 (압축 풀지 않고 더블클릭, ~183 MB)

받는 사람은 OS에 맞는 파일을 받아서 실행하면 끝. Node.js 같은 추가 설치 불필요.

## 로드맵

- [ ] 4번 — 교배 트리 화이트보드 (React Flow로 드래그/노드 연결)
- [ ] 패시브 한국어 카탈로그 자동완성
- [ ] 보유 팰 수정 모달 (현재는 삭제·재등록만)
- [ ] 알 크기 / 부화 시간
