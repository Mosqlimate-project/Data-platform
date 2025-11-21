"use client";

import { EndpointLayout } from "../EndpointLayout";

export function Infodengue() {
  const dataVariables = [
    { variable: "data_iniSE", type: "str", description: "Start date of epidemiological week" },
    { variable: "SE", type: "int", description: "Epidemiological week" },
    { variable: "casos_est", type: "float", description: "Estimated number of cases using nowcasting" },
    { variable: "casos_est_min", type: "int", description: "95% credibility interval (min)" },
    { variable: "casos", type: "int", description: "Number of notified cases (updated weekly)" },
    { variable: "municipio_geocodigo", type: "int", description: "IBGE municipality code" },
    { variable: "p_rt1", type: "float", description: "Probability (Rt > 1)" },
    { variable: "p_inc100k", type: "float", description: "Estimated incidence rate (per 100k pop)" },
    { variable: "nivel", type: "int", description: "Alert level (1 = green, 4 = red)" },
    { variable: "Rt", type: "float", description: "Reproductive number estimate" },
    { variable: "municipio_nome", type: "str", description: "Municipality name" },
    { variable: "pop", type: "float", description: "Population (IBGE)" },
    { variable: "receptivo", type: "int", description: "Climate receptivity indicator (0–3)" },
    { variable: "transmissao", type: "int", description: "Sustained transmission level (0–3)" },
    { variable: "umidmed", type: "float", description: "Average weekly humidity (%)" },
    { variable: "tempmed", type: "float", description: "Average weekly temperature (°C)" },
  ];

  const chartOptions = [
    { option: "disease", type: "str" },
    { option: "geocode", type: "int" },
    { option: "start", type: "date" },
    { option: "end", type: "date" },
  ];

  return (
    /*
    <EndpointLayout
      title="Mosquito-borne Diseases"
      description="Access data from the Infodengue project, providing epidemiological variables for Brazilian municipalities on a weekly basis."
      dataVariables={dataVariables}
      chartOptions={chartOptions}
    >
      <div className="text-center text-sm opacity-70">
        <p>Chart placeholder for Infodengue data (weekly cases, Rt, etc.)</p>
      </div>
    </EndpointLayout>
    */
    ""
  );
}
