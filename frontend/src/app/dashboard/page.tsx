"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next";

export default function DashboardOverview() {

  const { t } = useTranslation("common");

  return (
    <section className="max-w-6xl mx-auto px-8 py-8 text-text">
      {/* Header */}
      <header className="mb-4 text-center">
        <h1 className="text-3xl font-semibold text-violet-400 mb-3">
          {t("dashboard.overview.title")}
        </h1>

        <p className="text-lg text-secondary max-w-4xl mx-auto">
          {t("dashboard.overview.subtitle")}
        </p>
      </header>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* General */}
        <div className="border border-border rounded-2xl p-6 bg-bg shadow-sm flex flex-col">
          <div className="mb-3">
            <h2 className="text-2xl text-center mb-2">
              {t("dashboard.overview.general.title")}
            </h2>
            <div className="h-1 w-12 bg-lime-500 rounded-full mx-auto" />
          </div>

          <p className="text-base mb-3 text-secondary">
            {t("dashboard.overview.general.description")}
          </p>

          <div className="space-y-2 text-base flex-1">
            <p><strong>{t("dashboard.overview.general.what_is_displayed")}</strong>{t("dashboard.overview.general.what_is_displayed_description")}</p>
            <p><strong>{t("dashboard.overview.general.models")}</strong>{t("dashboard.overview.general.models_description")}</p>
            <p><strong>{t("dashboard.overview.general.diseases")}</strong>{t("dashboard.overview.general.diseases_description")}</p>
            <p><strong>{t("dashboard.overview.general.scale")}</strong>{t("dashboard.overview.general.scale_description")}</p>
            <p><strong>{t("dashboard.overview.general.goal")}</strong> {t("dashboard.overview.general.goal_description")}</p>

            <p className="mt-3"><strong>{t("dashboard.overview.general.typical_questions")}</strong></p>
            <ul className="ml-5 list-disc text-secondary">
              <li>{t("dashboard.overview.general.questions.0")}</li>
              <li>{t("dashboard.overview.general.questions.1")}</li>
            </ul>
          </div>

          <div className="mt-3 pt-4 border-t border-border flex justify-center">
            <Link
              href="/dashboard/quantitative?disease=A90&adm_level=2&adm_0=BRA&adm_1=21&adm_2=2111300&sprint=false&case_definition=reported"
              className="inline-flex items-center justify-center rounded-lg px-5 py-2
                         text-sm bg-text text-bg hover:opacity-80 transition"
            >
              {t("dashboard.overview.general.button")}
            </Link>
          </div>
        </div>

        {/* IMDC */}
        <div className="border border-border rounded-2xl p-6 bg-bg shadow-sm flex flex-col">
          <div className="mb-3">
            <h2 className="text-2xl text-center mb-2">
              {t("dashboard.overview.imdc.title")}
            </h2>
            <div className="h-1 w-12 bg-purple-500 rounded-full mx-auto" />
          </div>

          <p className="text-base mb-3 text-secondary">
            {t("dashboard.overview.imdc.description")}
            <strong> <a href="/IMDC">{t("dashboard.overview.imdc.link_name")}</a></strong>.
          </p>

          <div className="space-y-2 text-base flex-1">
            <p><strong>{t("dashboard.overview.imdc.what_is_displayed")}</strong>{t("dashboard.overview.imdc.what_is_displayed_description")}</p>
            <p><strong>{t("dashboard.overview.imdc.models")}</strong>{t("dashboard.overview.imdc.models_description")}</p>
            <p><strong>{t("dashboard.overview.imdc.diseases")}</strong>{t("dashboard.overview.imdc.diseases_description")}</p>
            <p><strong>{t("dashboard.overview.imdc.scale")}</strong>{t("dashboard.overview.imdc.scale_description")}</p>
            <p><strong>{t("dashboard.overview.imdc.goal")}</strong>{t("dashboard.overview.imdc.goal_description")}</p>

            <p className="mt-3"><strong>{t("dashboard.overview.imdc.typical_questions")}</strong></p>
            <ul className="ml-5 list-disc text-secondary">
              <li>{t("dashboard.overview.imdc.questions.0")}</li>
              <li>{t("dashboard.overview.imdc.questions.1")}</li>
              <li>{t("dashboard.overview.imdc.questions.2")}</li>
            </ul>
          </div>

          <div className="mt-3 pt-4 border-t border-border flex justify-center">
            <Link
              href="/dashboard/quantitative?disease=A90&adm_level=1&adm_0=BRA&adm_1=21&adm_2=2111300&sprint=true&case_definition=reported"
              className="inline-flex items-center justify-center rounded-lg px-5 py-2
                         text-sm bg-text text-bg hover:opacity-80 transition"
            >
              {t("dashboard.overview.imdc.button")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
