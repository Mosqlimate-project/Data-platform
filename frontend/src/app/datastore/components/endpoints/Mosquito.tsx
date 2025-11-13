"use client";

import { EndpointLayout } from "../EndpointLayout";

export function Mosquito() {
  const dataVariables = [
    { variable: "counting_id", type: "int", description: "Unique ID of the egg counting event" },
    { variable: "date", type: "str", description: "Date of data record" },
    { variable: "eggs", type: "int", description: "Number of eggs collected" },
    { variable: "latitude", type: "float", description: "Ovitrap latitude" },
    { variable: "longitude", type: "float", description: "Ovitrap longitude" },
    { variable: "municipality", type: "str", description: "Municipality name" },
    { variable: "municipality_code", type: "str", description: "Municipality geocode" },
    { variable: "state_code", type: "str", description: "State geocode" },
    { variable: "week", type: "int", description: "Epidemiological week" },
    { variable: "year", type: "int", description: "Year" },
  ];

  const chartOptions = [
    { option: "geocode", type: "int" },
    { option: "start", type: "date" },
    { option: "end", type: "date" },
  ];

  return (
    /*
    <EndpointLayout
      title="Mosquito Egg Count"
      description="Access mosquito abundance data from the Contaovos project, based on eggtrap monitoring across Brazil."
      dataVariables={dataVariables}
      chartOptions={chartOptions}
    >
      <div className="text-center text-sm opacity-70">
        <p>Chart placeholder for egg count trends over time</p>
      </div>
    </EndpointLayout>
    */
    ""
  );
}
