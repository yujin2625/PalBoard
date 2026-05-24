import { META } from "@/lib/pal-data";

export default function InfoPage() {
  const m = META.breedingMechanic;
  return (
    <div className="max-w-3xl space-y-4 leading-relaxed [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h3]:font-medium [&_h3]:mt-4 [&_p]:text-sm [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-sm [&_li]:my-1 [&_a]:underline [&_a]:text-chillet-600 dark:[&_a]:text-chillet-300 [&_table]:text-sm [&_table]:w-full [&_th]:text-left [&_th]:py-1 [&_th]:pr-3 [&_td]:py-1 [&_td]:pr-3 [&_code]:bg-chillet-100 dark:[&_code]:bg-chillet-800/60 [&_code]:px-1 [&_code]:rounded [&_hr]:my-6 [&_hr]:border-chillet-200/70 dark:[&_hr]:border-chillet-800/60">
      <h1>팰월드 유전 시스템</h1>
      <p className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
        본 자료의 출처: <a href={META.wikiReference}>palworld.wiki.gg / Breeding</a>,{" "}
        <a href="https://github.com/tylercamp/palcalc">tylercamp/palcalc</a> ·
        palcalc DB 버전 <code>{META.palcalcDbVersion}</code> · 가져온 날짜{" "}
        <code>{META.fetchedAt}</code>
      </p>
      <p className="text-sm text-chillet-700/70 dark:text-chillet-200/60">위키 기준 게임 버전: {m.wikiVersion}</p>

      <h2>1. 자식 종 결정</h2>
      <p>{m.formula}</p>
      <p>
        팰마다 숨겨진 <strong>BreedingPower</strong> 값(약 10~1500)이 정해져 있고, 부모의 평균에
        가장 가까운 BP를 가진 후보 팰이 자식이 됩니다. 동률일 경우 내부 인덱스가 더 낮은 쪽이
        선택됩니다. 이 규칙은 대부분의 조합에 적용되지만, 다음 케이스는 <strong>고정 결과</strong>로
        오버라이드됩니다:
      </p>
      <ul>
        <li>
          <strong>동종 한정 팰</strong>: 치키피, 블레이즈머트 류, 팔라디우스, 네크로무스,
          프로스탈리온, 제트라곤, 벨라느와르 리베로, 미모그, 제노베이더, 제노가드, 제노로드 등
          — 자기 자신과만 교배 가능.
        </li>
        <li>
          <strong>변종/타워 보스</strong>: 특정 부모 쌍이 변종 또는 타워 보스 팰을 만듭니다
          (예: 오시러스 + 페탈리아 = 라일린, 아주로베 + 프로스트플룸 = 아주로베 크리스트).
        </li>
      </ul>
      <p className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
        본 앱은 palcalc의 전체 페어→자식 매핑 테이블({META.pairCount.toLocaleString()}건)을
        그대로 사용하므로 위 오버라이드도 정확히 반영됩니다.
      </p>

      <h2>2. 패시브 상속</h2>
      <p>
        부모의 모든 고유 패시브가 풀(중복 제거)을 이룹니다. 자식은 다음 규칙으로 패시브를 받습니다:
      </p>
      <ul>
        <li>
          <strong>상속 슬롯 수 X</strong>: P(X=1)=40%, P(X=2)=30%, P(X=3)=20%, P(X=4)=10%
        </li>
        <li>
          <strong>무작위 추가 슬롯 수 Y</strong>: 동일 분포. Y &gt; X이면 남은 슬롯에 무작위 패시브가 채워집니다.
        </li>
        <li>X &gt; 부모 풀 크기인 경우, 풀의 모든 패시브가 상속되고 남는 슬롯은 무작위로 채워집니다.</li>
      </ul>
      <p className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
        참고로 «부모 풀에 있는 X개를 전부 상속» 확률은 {"풀 크기 4 → 10%, 3 → 12%, 2 → 24%, 1 → 40%"}.
      </p>

      <h2>3. 액티브 스킬 상속</h2>
      <p>{m.activeSkill}</p>

      <h2>4. IV / 잠재 능력치 상속</h2>
      <p>{m.ivs}</p>

      <h2>5. 부화 / 알 시간</h2>
      <p>
        조합된 알은 모체의 크기에 따라 결정됩니다 (S/M/L/XL). 부화 시간은 크기에 따라 다르며,
        부화기 위치(차가운/뜨거운 환경)는 종에 따라 영향을 줍니다. 본 MVP는 부화 시간 정보를
        포함하지 않습니다.
      </p>

      <hr />
      <h3>요약 PMF</h3>
      <table>
        <thead>
          <tr>
            <th>X (상속 슬롯 수)</th>
            <th>P</th>
            <th>Y (무작위 슬롯 수)</th>
            <th>P</th>
          </tr>
        </thead>
        <tbody>
          {m.passives.slotPmf.map((v, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{(v * 100).toFixed(0)}%</td>
              <td>{i + 1}</td>
              <td>{((m.passives.randomPmf[i] ?? 0) * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
