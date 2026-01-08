"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { LineChart, Series } from "@/components/dashboard/QuantitativeLineChart";

interface CaseData {
  date: string;
  cases: number;
}

interface DiseaseOption {
  code: string;
  name: string;
}

interface CountryOption {
  geocode: string;
  name: string;
}

interface DashboardClientProps {
  category: "quantitative" | "qualitative";
}

export default function DashboardClient({ category }: DashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getInitialLevel = () => {
    const param = searchParams.get("adm_level");
    return param !== null ? Number(param) : 1;
  };

  const [inputs, setInputs] = useState({
    disease: "",
    adm_level: getInitialLevel(),
    adm_0: searchParams.get("adm_0") || "",
    adm_1: searchParams.get("adm_1") || "SC",
    adm_2: searchParams.get("adm_2") || "",
    sprint: false,
  });

  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<Series>({ labels: [], data: [] });
  const [diseaseOptions, setDiseaseOptions] = useState<DiseaseOption[]>([]);
  const [diseasesLoading, setDiseasesLoading] = useState(false);
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  const updateURL = (newParams: Partial<typeof inputs>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    });

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const fetchDiseases = useCallback(async () => {
    setDiseasesLoading(true);
    try {
      const params = new URLSearchParams({
        category: category,
        adm_level: inputs.adm_level.toString(),
      });

      const res = await fetch(`/api/vis/dashboard/diseases/?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch diseases");

      const data: DiseaseOption[] = await res.json();
      setDiseaseOptions(data);

      if (data.length > 0) {
        const currentIsValid = data.some((d) => d.code === inputs.disease);
        if (!currentIsValid || !inputs.disease) {
          setInputs((prev) => ({ ...prev, disease: data[0].code }));
        }
      } else {
        setInputs((prev) => ({ ...prev, disease: "" }));
      }
    } catch (error) {
      console.error(error);
      setDiseaseOptions([]);
    } finally {
      setDiseasesLoading(false);
    }
  }, [category, inputs.adm_level, inputs.disease]);

  const fetchCountries = useCallback(async () => {
    if (!inputs.disease) return;

    setCountriesLoading(true);
    try {
      const params = new URLSearchParams({
        category: category,
        adm_level: inputs.adm_level.toString(),
        disease: inputs.disease,
      });

      const res = await fetch(`/api/vis/dashboard/countries/?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch countries");

      const data: CountryOption[] = await res.json();
      setCountryOptions(data);

      if (data.length > 0) {
        const currentIsValid = data.some((c) => c.geocode === inputs.adm_0);
        if (!currentIsValid || !inputs.adm_0) {
          setInputs((prev) => ({ ...prev, adm_0: data[0].geocode }));
        }
      } else {
        setInputs((prev) => ({ ...prev, adm_0: "" }));
      }
    } catch (error) {
      console.error(error);
      setCountryOptions([]);
    } finally {
      setCountriesLoading(false);
    }
  }, [category, inputs.adm_level, inputs.disease, inputs.adm_0]);

  const fetchData = async () => {
    if (!inputs.disease) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        disease: inputs.disease,
        adm_level: inputs.adm_level.toString(),
        sprint: inputs.sprint.toString(),
      });

      if (inputs.adm_0) params.append("adm_0", inputs.adm_0);
      if (inputs.adm_1) params.append("adm_1", inputs.adm_1);
      if (inputs.adm_2) params.append("adm_2", inputs.adm_2.toString());

      const res = await fetch(`/api/vis/dashboard/cases?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch cases");

      const rawData: CaseData[] = await res.json();
      setChartData({
        labels: rawData.map((d) => new Date(d.date)),
        data: rawData.map((d) => d.cases),
      });
    } catch (error) {
      console.error(error);
      setChartData({ labels: [], data: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const param = searchParams.get("adm_level");
    if (param !== null) {
      const urlLevel = Number(param);
      if (urlLevel !== inputs.adm_level) {
        setInputs((prev) => ({ ...prev, adm_level: urlLevel }));
      }
    }
    fetchDiseases();
  }, [fetchDiseases, searchParams, inputs.adm_level]);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  useEffect(() => {
    if (inputs.disease) fetchData();
  }, [inputs.disease]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setInputs((prev) => ({ ...prev, [name]: newValue }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white p-4 rounded shadow space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold capitalize">{category} Dashboard</h2>
          {diseasesLoading && <span className="text-sm text-gray-500">Updating diseases...</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Disease</label>
            <select
              name="disease"
              value={inputs.disease}
              onChange={handleChange}
              disabled={diseasesLoading || diseaseOptions.length === 0}
              className="border p-2 rounded disabled:bg-gray-100"
            >
              {diseaseOptions.length === 0 && !diseasesLoading && (
                <option value="">No diseases found</option>
              )}
              {diseaseOptions.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Country</label>
            <select
              name="adm_0"
              value={inputs.adm_0}
              onChange={handleChange}
              disabled={countriesLoading || countryOptions.length === 0}
              className="border p-2 rounded disabled:bg-gray-100"
            >
              {countryOptions.length === 0 && !countriesLoading && (
                <option value="">No countries found</option>
              )}
              {countryOptions.map((c) => (
                <option key={c.geocode} value={c.geocode}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {inputs.adm_level >= 1 && (
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1">State</label>
              <input
                type="text"
                name="adm_1"
                value={inputs.adm_1}
                onChange={handleChange}
                className="border p-2 rounded"
                placeholder="e.g. SC"
              />
            </div>
          )}

          {inputs.adm_level >= 2 && (
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1">City</label>
              <input
                type="number"
                name="adm_2"
                value={inputs.adm_2}
                onChange={handleChange}
                className="border p-2 rounded"
                placeholder="e.g. 4200000"
              />
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={fetchData}
              disabled={loading || !inputs.disease}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 w-full"
            >
              {loading ? "Loading..." : "Update Data"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow h-[500px]">
        <h2 className="text-xl font-bold mb-4">Cases Timeline</h2>
        {inputs.disease ? (
          <LineChart
            data={chartData}
            predictions={[]}
            height="100%"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Please select a disease to view data.
          </div>
        )}
      </div>
    </div>
  );
}
