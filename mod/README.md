# PalBoardExport — 게임에서 보유 팰 내보내기 (UE4SS 모드)

남의 서버에 **게스트로 접속**해서 플레이할 때, 세이브 파일은 호스트 PC에 있어서
내 팰을 파일로 뽑을 방법이 없습니다. 하지만 **내 팰 데이터는 팰박스 UI를 그리기
위해 내 게임 클라이언트로 이미 복제**되어 있습니다. 이 모드는 그 데이터를 읽어
JSON 파일로 저장하고, PalBoard가 그걸 불러옵니다.

- ✅ 게스트로 접속한 서버/코옵에서도 동작 (내 팰만 읽음)
- ✅ **읽기 전용** — 게임/세이브에 아무것도 쓰지 않음 (에딧/치트 모드보다 위험 낮음)
- ⚠️ 그래도 모드 사용을 허용하는 서버에서만 쓰세요. 안티치트가 있는 서버는 피하세요.

내 세이브가 내 PC에 있는 경우(솔플 / 내가 연 서버)라면 이 모드 대신 PalBoard의
세이브 임포트를 쓰는 게 더 정확합니다. 이 모드는 **게스트 케이스 전용**입니다.

---

## 1. 준비물: UE4SS 설치

이 모드는 [UE4SS](https://github.com/UE4SS-RE/RE-UE4SS)(언리얼 엔진용 스크립트
로더) 위에서 돕니다. 먼저 설치하세요.

> ⚠️ **이미 UE4SS가 있다면 절대 두 번 설치하지 마세요.** Steam 창작마당의
> "UE4SS (Experimental)"를 구독했거나 다른 모드팩에 UE4SS가 포함돼 있으면,
> 여기에 또 수동 설치하면 **UE4SS가 중복되어 게임이 시작하자마자 크래시**합니다.
> 이미 있으면 이 1단계를 건너뛰고, 그 기존 UE4SS의 Mods 폴더에 2단계로 바로
> 넣으세요. (창작마당 버전은 Steam이 자동 업데이트해줘서 게임 패치 후에도 잘
> 유지되므로 오히려 권장됩니다.)

1. [RE-UE4SS Releases](https://github.com/UE4SS-RE/RE-UE4SS/releases)에서 최신
   릴리스를 받습니다. (Palworld는 최신/Experimental 빌드가 필요할 수 있음 —
   [Palworld 모딩 위키](https://pwmodding.wiki/docs/category/ue4ss) 참고)
2. 압축을 풀어 나온 파일들을 게임의 **`Palworld/Pal/Binaries/Win64/`** 폴더에
   넣습니다. (`dwmapi.dll`, `UE4SS.dll`, `ue4ss/` 등이 이 폴더에 들어감)
3. 게임을 한 번 실행해서 UE4SS가 정상 로드되는지 확인합니다. (콘솔 창이 뜨거나
   `ue4ss/UE4SS.log`가 생성됨)

> Steam/게임패스, 게임 버전에 따라 설치 위치·파일이 다를 수 있으니 위 위키의
> Palworld 전용 설치 안내를 따르는 게 가장 확실합니다.

---

## 2. 이 모드 설치

`mod/PalBoardExport` 폴더를 UE4SS의 Mods 폴더로 복사합니다.

```
Palworld/Pal/Binaries/Win64/ue4ss/Mods/PalBoardExport/
    enabled.txt
    Scripts/main.lua
```

- `enabled.txt`가 있으면 UE4SS가 자동으로 켭니다.
- 구버전 UE4SS라면 대신 `ue4ss/Mods/mods.txt`에 다음 줄을 추가하세요:
  ```
  PalBoardExport : 1
  ```

경로에 `ue4ss/`가 없고 `Mods/`가 `Win64/` 바로 아래 있는 배치도 있습니다. 설치한
UE4SS 버전의 폴더 구조에 맞춰 `Mods/` 아래에 넣으면 됩니다.

---

## 3. 사용법

1. 게임 접속 후 **팰박스를 한 번 엽니다** (클라이언트로 팰 데이터가 로드되도록).
2. **`F8`** 키 — 보유 팰을 JSON으로 내보냅니다.
3. 저장 위치: 기본값은 게임의 **`Pal/Binaries/Win64/palboard-export.json`**.
   (정확한 전체 경로가 UE4SS 콘솔에 찍힙니다.)
4. PalBoard를 열고 **`🎮 게임에서 가져오기`** 버튼 → 그 JSON 파일 선택.
   현재 선택된 월드로 팰들이 등록됩니다.

키를 바꾸고 싶으면 `Scripts/main.lua` 맨 위 `CONFIG.export_key`를 수정하세요.

---

## 4. 검증 / 문제 해결

이 모드에서 게임 버전에 따라 달라질 수 있는 유일한 부분은 **클래스/프로퍼티
이름**입니다. `F8`이 "찾은 팰 없음"이라고 하면 아래 순서로 맞추세요.

### (a) 디스커버리 실행
게임 안에서 **`F7`** 키를 누르면 UE4SS 콘솔에 후보 클래스와 그 첫 객체의 필드
읽힘 여부가 출력됩니다. 예:

```
[PalBoardExport]   PalIndividualCharacterParameter            -> 32 instance(s)
[PalBoardExport]      .CharacterID      readable=true  value=SheepBall
[PalBoardExport]      .PassiveSkillList readable=true  value=...
[PalBoardExport]      .Talent_HP        readable=true  value=80
```

- 인스턴스 수가 0이면 → `CONFIG.pal_param_class` 이름이 다른 것. 아래 Live View로
  실제 이름을 찾으세요.
- 인스턴스는 있는데 `readable=false`거나 값이 `-` 면 → `CONFIG.fields`의
  프로퍼티 이름이 다른 것.

### (b) UE4SS Live View로 실제 이름 확인
UE4SS 콘솔의 GUI(기본 단축키 있음, 위키 참고) → **Live View**에서 객체 트리를
탐색해 팰 파라미터 객체와 그 안의 필드 실제 이름(`CharacterID`, `PassiveSkillList`,
`Talent_HP`/`Talent_Shot`/`Talent_Defense`, `Gender`, `Level`, `NickName`)을
확인합니다. `main.lua` 맨 위 `CONFIG`를 그 이름들로 고치고 다시 `F8`.

### (c) 내 팰만 안 나오고 남의 팰까지 섞이거나, 반대로 내 것도 안 나올 때
`CONFIG.export_all_owners`를 `true`로 바꿔 우선 전량 덤프 → PalBoard에서 확인 후
필요 없는 것 삭제. (소유자 필터는 게임 버전별 차이가 커서 기본은 단순 전량 수집
후 중복 제거만 합니다.)

### 흔한 원인
- **팰박스를 안 열었다** → 데이터가 클라에 아직 로드 안 됨. 한 번 열고 재시도.
- **UE4SS 자체가 로드 안 됨** → `ue4ss/UE4SS.log` 확인. 게임 버전에 맞는
  Experimental 빌드가 필요할 수 있음.
- **파일이 안 생김** → 콘솔의 `ERROR: could not open output file` 확인. 권한
  문제면 `CONFIG.output_path`를 쓰기 가능한 절대경로로 지정 (예:
  `output_path = "C:/Users/이름/Desktop/palboard-export.json"`).

---

## 5. 내보내지는 데이터

팰 1마리당: 종(CharacterID 내부코드), 성별, 레벨, 별명, 패시브(내부코드 배열),
IV(HP/공격/방어). **종·패시브의 표시명 변환은 전부 PalBoard 쪽에서** 처리하므로
이 모드는 게임 내부코드만 그대로 뱉습니다 (패치 내성을 위해 의도적으로 단순화).

출력 예:
```json
{"version":1,"source":"ue4ss-mod","pals":[
  {"characterId":"SheepBall","gender":"Male","level":12,
   "passives":["CraftSpeed_up3","Rare"],"ivHp":80,"ivAtk":55,"ivDef":70}
]}
```
