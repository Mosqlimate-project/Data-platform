import React from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  type DiseaseOption,
  type Option,
  type SprintOption,
  type AdmLevel
} from "@/lib/dashboard/api";

interface DashboardParametersProps {
  isConfigLoading: boolean;
  inputs: {
    disease: string;
    adm_level: AdmLevel;
    adm_0: string;
    adm_1: string;
    adm_2: string;
    sprint: boolean;
    case_definition: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleCaseDefinitionChange: (def: string) => void;
  toggleSprint: (year: number) => void;
  selectedSprints: number[];
  diseaseOptions: DiseaseOption[];
  countryOptions: Option[];
  stateOptions: Option[];
  cityOptions: Option[];
  sprintOptions: SprintOption[];
}

export default function DashboardParameters({
  isConfigLoading,
  inputs,
  handleChange,
  handleCaseDefinitionChange,
  toggleSprint,
  selectedSprints,
  diseaseOptions,
  countryOptions,
  stateOptions,
  cityOptions,
  sprintOptions
}: DashboardParametersProps) {
  const { t } = useTranslation('common');

  return (
    <div className="bg-bg border border-border rounded-lg shadow-sm relative">
      {isConfigLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg/60 backdrop-blur-[1px] rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      <div className="flex flex-wrap gap-4 p-4">
        <div className="flex-1 flex flex-wrap gap-4 min-w-[300px]">
          {diseaseOptions.length > 0 && (
            <div className="flex flex-col flex-1 min-w-[150px]">
              <label className="text-sm font-semibold mb-1 text-text">{t('dashboard.filters.disease')}</label>
              <select
                name="disease"
                value={inputs.disease}
                onChange={handleChange}
                className="border border-border bg-bg text-text p-2 rounded disabled:opacity-50"
              >
                {diseaseOptions.map((d) => (
                  <option key={d.code} value={d.code}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {countryOptions.length > 0 && (
            <div className="flex flex-col flex-1 min-w-[150px]">
              <label className="text-sm font-semibold mb-1 text-text">{t('dashboard.filters.country')}</label>
              <select
                name="adm_0"
                value={inputs.adm_0}
                onChange={handleChange}
                className="border border-border bg-bg text-text p-2 rounded disabled:opacity-50"
              >
                {countryOptions.map((c) => (
                  <option key={c.geocode} value={c.geocode}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {inputs.adm_level >= 1 && stateOptions.length > 0 && (
            <div className="flex flex-col flex-1 min-w-[150px]">
              <label className="text-sm font-semibold mb-1 text-text">{t('dashboard.filters.state')}</label>
              <select
                name="adm_1"
                value={inputs.adm_1}
                onChange={handleChange}
                className="border border-border bg-bg text-text p-2 rounded disabled:opacity-50"
              >
                {stateOptions.map((s) => (
                  <option key={s.geocode} value={s.geocode}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {inputs.adm_level >= 2 && cityOptions.length > 0 && (
            <div className="flex flex-col flex-1 min-w-[150px]">
              <label className="text-sm font-semibold mb-1 text-text">{t('dashboard.filters.city')}</label>
              <select
                name="adm_2"
                value={inputs.adm_2}
                onChange={handleChange}
                className="border border-border bg-bg text-text p-2 rounded disabled:opacity-50"
              >
                {cityOptions.map((c) => (
                  <option key={c.geocode} value={c.geocode}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="w-full md:w-auto md:w-72 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4 flex flex-col gap-2">
          {!inputs.sprint ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold mb-1 text-text">{t('dashboard.filters.case_definition')}</h3>
              <div className="flex bg-hover p-1 rounded-lg w-full">
                {["reported", "probable"].map((def) => (
                  <button
                    key={def}
                    onClick={() => handleCaseDefinitionChange(def)}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${inputs.case_definition === def
                      ? "bg-bg text-blue-600 shadow-sm border border-border"
                      : "text-secondary hover:text-text"
                      }`}
                  >
                    {t(`dashboard.filters.${def}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            sprintOptions.length > 0 && (
              <>
                <h3 className="text-sm font-semibold mb-1 text-text">{t('dashboard.filters.imdc_sprint')}</h3>
                <div className="flex flex-wrap gap-2">
                  {sprintOptions.map((sprint) => {
                    const isSelected = selectedSprints.includes(sprint.year);
                    return (
                      <button
                        key={sprint.id}
                        onClick={() => toggleSprint(sprint.year)}
                        className={`px-2 py-1 rounded text-xs border transition-colors ${isSelected
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-bg text-secondary border-border hover:bg-hover"
                          }`}
                      >
                        {sprint.year}
                      </button>
                    );
                  })}
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
