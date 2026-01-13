"use client";

import { useState } from "react";
import { EndpointLayout } from "../EndpointLayout";
import { endpoints } from "@/app/datastore/data";
import CitySearch from "@/app/datastore/components/CitySearch";
import TemperatureChart from "../charts/Temperature";
import AccumulatedWaterfallChart from "../charts/AccumulatedWaterfall";
import UmidPressaoMedChart from "../charts/UmidPressaoMed";

export function Climate() {
  const config = endpoints.find((e) => e.endpoint === "/climate/");

  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const [geocode, setGeocode] = useState<number | undefined>(3304557);
  const [startDate, setStartDate] = useState<string>(formatDate(oneYearAgo));
  const [endDate, setEndDate] = useState<string>(formatDate(now));

  const handleStartDateChange = (v: string) => {
    if (endDate && v > endDate) return;
    setStartDate(v);
  };
  const handleEndDateChange = (v: string) => {
    if (startDate && v < startDate) return;
    setEndDate(v);
  };

  if (!config) return <div>Endpoint configuration not found</div>;

  return (
    <EndpointLayout
      title={config.name}
      description={config.description}
      endpoint={config.endpoint}
      dataVariables={config.data_variables}
      chartOptions={config.chart_options}
      controls={
        <>
          <div className="flex flex-col gap-1 relative z-20">
            <CitySearch value={geocode} onChange={setGeocode} />
          </div>

          <div className="flex gap-2 relative z-10">
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
        </>
      }
    >
      <div className="flex flex-col gap-6 w-full">
        <div>
          <h3 className="text-sm font-semibold mb-2 opacity-80">
            Temperature Overview
          </h3>
          <TemperatureChart
            geocode={String(geocode || "")}
            start={startDate}
            end={endDate}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 opacity-80">
            Precipitation (Accumulated)
          </h3>
          <AccumulatedWaterfallChart
            geocode={String(geocode || "")}
            start={startDate}
            end={endDate}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 opacity-80">
            Humidity & Pressure (Average)
          </h3>
          <UmidPressaoMedChart
            geocode={String(geocode || "")}
            start={startDate}
            end={endDate}
          />
        </div>
      </div>
    </EndpointLayout>
  );
}
