"use client";

import { useState } from "react";
import { EndpointLayout } from "../EndpointLayout";

import TemperatureChart from "../charts/Temperature";
import AccumulatedWaterfallChart from "../charts/AccumulatedWaterfall";
import UmidPressaoMedChart from "../charts/UmidPressaoMed";

export function Climate() {
  const dataVariables = [
    { variable: "date", type: "date (YYYY-mm-dd)", description: "Day of the year" },
    { variable: "geocodigo", type: "int", description: "IBGE municipality code" },
    { variable: "temp_min", type: "float (°C)", description: "Minimum daily temperature" },
    { variable: "temp_med", type: "float (°C)", description: "Average daily temperature" },
    { variable: "temp_max", type: "float (°C)", description: "Maximum daily temperature" },
    { variable: "precip_tot", type: "float (mm)", description: "Total daily precipitation" },
    { variable: "pressao_med", type: "float (atm)", description: "Average sea level pressure" },
    { variable: "umid_med", type: "float (%)", description: "Average relative humidity" },
  ];

  const chartOptions = [
    { option: "geocode", type: "int" },
    { option: "start", type: "date" },
    { option: "end", type: "date" },
  ];

  // Local state for chart inputs
  const [geocode, setGeocode] = useState<number>(3304557);
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-03-03");

  const handleStartDateChange = (v: string) => {
    if (endDate && v > endDate) return;
    setStartDate(v);
  };
  const handleEndDateChange = (v: string) => {
    if (startDate && v < startDate) return;
    setEndDate(v);
  };

  return (
    /*
    <EndpointLayout
      title="Climate Data"
      description="Access daily climate variables for Brazilian municipalities derived from Copernicus ERA5 reanalysis data."
      dataVariables={dataVariables}
      chartOptions={chartOptions}
    >
      <div className="flex flex-col gap-6 w-full">
        <div>
          <h3 className="text-sm font-semibold mb-2 opacity-80">
            Temperature Overview
          </h3>
          <TemperatureChart
            geocode={String(geocode)}
            start={startDate}
            end={endDate}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 opacity-80">
            Precipitation (Accumulated)
          </h3>
          <AccumulatedWaterfallChart
            geocode={String(geocode)}
            start={startDate}
            end={endDate}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 opacity-80">
            Humidity & Pressure (Average)
          </h3>
          <UmidPressaoMedChart
            geocode={String(geocode)}
            start={startDate}
            end={endDate}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-8 border-t pt-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Geocode</label>
          <input
            type="number"
            value={geocode}
            onChange={(e) => setGeocode(Number(e.target.value))}
            className="border rounded-md px-2 py-1"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex flex-col flex-1 gap-1">
            <label className="text-sm font-medium">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="border rounded-md px-2 py-1"
            />
          </div>
          <div className="flex flex-col flex-1 gap-1">
            <label className="text-sm font-medium">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="border rounded-md px-2 py-1"
            />
          </div>
        </div>
      </div>
    </EndpointLayout>
    */
    ""
  );
}
