"use client";

import { META } from "@/lib/pal-data";
import { useT } from "@/lib/i18n";

export default function InfoPage() {
  const t = useT();
  const m = META.breedingMechanic;
  return (
    <div className="max-w-3xl space-y-4 leading-relaxed [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h3]:font-medium [&_h3]:mt-4 [&_p]:text-sm [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-sm [&_li]:my-1 [&_a]:underline [&_a]:text-chillet-600 dark:[&_a]:text-chillet-300 [&_table]:text-sm [&_table]:w-full [&_th]:text-left [&_th]:py-1 [&_th]:pr-3 [&_td]:py-1 [&_td]:pr-3 [&_code]:bg-chillet-100 dark:[&_code]:bg-chillet-800/60 [&_code]:px-1 [&_code]:rounded [&_hr]:my-6 [&_hr]:border-chillet-200/70 dark:[&_hr]:border-chillet-800/60">
      <h1>{t("info.title")}</h1>
      <p className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
        {t("info.sources.prefix")}{" "}
        <a href={META.wikiReference}>palworld.wiki.gg / Breeding</a>,{" "}
        <a href="https://github.com/tylercamp/palcalc">tylercamp/palcalc</a> ·{" "}
        {t("info.dbVersion")} <code>{META.palcalcDbVersion}</code> · {t("info.fetchedAt")}{" "}
        <code>{META.fetchedAt}</code>
      </p>
      <p className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
        {t("info.gameVersion")}: {m.wikiVersion}
      </p>

      <h2>{t("info.s1.title")}</h2>
      <p>{m.formula}</p>
      <p>{t("info.s1.intro")}</p>
      <ul>
        <li>{t("info.s1.li1")}</li>
        <li>{t("info.s1.li2")}</li>
      </ul>
      <p className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
        {t("info.s1.note", { n: META.pairCount.toLocaleString() })}
      </p>

      <h2>{t("info.s2.title")}</h2>
      <p>{t("info.s2.intro")}</p>
      <ul>
        <li>{t("info.s2.li1")}</li>
        <li>{t("info.s2.li2")}</li>
        <li>{t("info.s2.li3")}</li>
      </ul>
      <p className="text-sm text-chillet-700/70 dark:text-chillet-200/60">{t("info.s2.note")}</p>

      <h2>{t("info.s3.title")}</h2>
      <p>{m.activeSkill}</p>

      <h2>{t("info.s4.title")}</h2>
      <p>{m.ivs}</p>

      <h2>{t("info.s5.title")}</h2>
      <p>{t("info.s5.body")}</p>

      <hr />
      <h3>{t("info.pmf.title")}</h3>
      <table>
        <thead>
          <tr>
            <th>{t("info.pmf.slot")}</th>
            <th>{t("info.pmf.p")}</th>
            <th>{t("info.pmf.rand")}</th>
            <th>{t("info.pmf.p")}</th>
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
