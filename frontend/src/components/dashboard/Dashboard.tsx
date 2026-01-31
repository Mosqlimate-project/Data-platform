"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { LineChart, Series, QuantitativePrediction } from "@/components/dashboard/QuantitativeLineChart";
import {
  Loader2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Search, X, Eye, EyeOff, CheckSquare, Square
} from "lucide-react";

export const dynamic = "force-dynamic";

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

interface StateOption {
  geocode: string;
  name: string;
}

interface CityOption {
  geocode: string;
  name: string;
}

interface SprintOption {
  id: number;
  year: number;
}

interface PredictionScore {
  name: string;
  score: number;
}

interface Prediction {
  id: number;
  owner: string;
  repository: string;
  start: string;
  end: string;
  sprint: number | null;
  scores: PredictionScore[];
}

interface DashboardClientProps {
  category: "quantitative" | "categorical";
}

interface PredictionRowData {
  date: string;
  pred: number;
  lower_95?: number;
  lower_90?: number;
  lower_80?: number;
  lower_50?: number;
  upper_50?: number;
  upper_80?: number;
  upper_90?: number;
  upper_95?: number;
}

const SCORE_COLUMNS = [
  { key: "mae_score", label: "MAE" },
  { key: "mse_score", label: "MSE" },
  { key: "crps_score", label: "CRPS" },
  { key: "interval_score", label: "Interval" },
  { key: "wis_score", label: "WIS" },
];

const ITEMS_PER_PAGE = 15;

const CHART_COLORS = [
  "#44aa99", "#999933", "#88ccee", "#ddcc77", "#cc6677",
  "#2563eb", "#dc2626", "#16a34a", "#d97706", "#9333ea",
  "#0891b2", "#be123c", "#4d7c0f", "#b45309", "#7c3aed",
  "#2f4b7c", "#665191", "#a05195", "#d45087", "#f95d6a",
  "#ff7c43", "#ffa600", "#003f5c", "#58508d", "#bc5090",
  "#ff6361", "#00876c", "#4c9c85", "#78b19f", "#a0c6b9",
  "#d43d51", "#ec8f5e", "#f3b98c", "#87bc45", "#27aeef",
  "#b33dc6", "#882255", "#117733", "#332288", "#aa4499",
];

export default function DashboardClient({ category }: DashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getInitialLevel = () => {
    const param = searchParams.get("adm_level");
    return param !== null ? Number(param) : 1;
  };

  const [inputs, setInputs] = useState({
    disease: searchParams.get("disease") || "",
    adm_level: getInitialLevel(),
    adm_0: searchParams.get("adm_0") || "",
    adm_1: searchParams.get("adm_1") || "",
    adm_2: searchParams.get("adm_2") || "",
    sprint: searchParams.get("sprint") === "true",
  });

  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<Series>({ labels: [], data: [] });
  const [chartPredictions, setChartPredictions] = useState<QuantitativePrediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState<number[]>([]);
  const [activeIntervals, setActiveIntervals] = useState<Set<number>>(new Set());

  const [diseaseOptions, setDiseaseOptions] = useState<DiseaseOption[]>([]);
  const [diseasesLoading, setDiseasesLoading] = useState(true);

  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  const [stateOptions, setStateOptions] = useState<StateOption[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);

  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [sprintOptions, setSprintOptions] = useState<SprintOption[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);

  const [selectedSprints, setSelectedSprints] = useState<number[]>([]);

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const [predictionSearch, setPredictionSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  const updateURL = useCallback(
    (newParams: Partial<typeof inputs>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value) {
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      });

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const fetchDiseases = useCallback(async () => {
    setDiseasesLoading(true);
    try {
      const params = new URLSearchParams({
        category: category,
        adm_level: inputs.adm_level.toString(),
        sprint: inputs.sprint.toString(),
      });

      const res = await fetch(`/api/vis/dashboard/diseases?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch diseases");

      const data: DiseaseOption[] = await res.json();
      setDiseaseOptions(data);

      if (data.length > 0) {
        setInputs((prev) => {
          const currentIsValid = data.some((d) => d.code === prev.disease);
          if (!currentIsValid || !prev.disease) {
            const defaultDisease = data[0].code;
            updateURL({ disease: defaultDisease });
            return { ...prev, disease: defaultDisease };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error(error);
      setDiseaseOptions([]);
    } finally {
      setDiseasesLoading(false);
    }
  }, [category, inputs.adm_level, inputs.sprint, updateURL]);

  const fetchCountries = useCallback(async () => {
    if (!inputs.disease) return;

    setCountriesLoading(true);
    try {
      const params = new URLSearchParams({
        category: category,
        adm_level: inputs.adm_level.toString(),
        disease: inputs.disease,
        sprint: inputs.sprint.toString(),
      });

      const res = await fetch(`/api/vis/dashboard/countries?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch countries");

      const data: CountryOption[] = await res.json();
      setCountryOptions(data);

      if (data.length > 0) {
        setInputs((prev) => {
          const currentIsValid = data.some((c) => c.geocode === prev.adm_0);
          if (!currentIsValid || !prev.adm_0) {
            const defaultCountry = data[0].geocode;
            updateURL({ adm_0: defaultCountry });
            return { ...prev, adm_0: defaultCountry };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error(error);
      setCountryOptions([]);
    } finally {
      setCountriesLoading(false);
    }
  }, [category, inputs.adm_level, inputs.disease, inputs.sprint, updateURL]);

  const fetchStates = useCallback(async () => {
    if (!inputs.disease || !inputs.adm_0 || inputs.adm_level < 1) return;

    setStatesLoading(true);
    try {
      const params = new URLSearchParams({
        category: category,
        adm_level: inputs.adm_level.toString(),
        disease: inputs.disease,
        country: inputs.adm_0,
        sprint: inputs.sprint.toString(),
      });

      const res = await fetch(`/api/vis/dashboard/states?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch states");

      const data: StateOption[] = await res.json();
      setStateOptions(data);

      if (data.length > 0) {
        setInputs((prev) => {
          const currentIsValid = data.some((s) => s.geocode === prev.adm_1);
          if (!currentIsValid || !prev.adm_1) {
            const defaultState = data[0].geocode;
            updateURL({ adm_1: defaultState });
            return { ...prev, adm_1: defaultState };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error(error);
      setStateOptions([]);
    } finally {
      setStatesLoading(false);
    }
  }, [category, inputs.adm_level, inputs.disease, inputs.adm_0, inputs.sprint, updateURL]);

  const fetchCities = useCallback(async () => {
    if (!inputs.disease || !inputs.adm_0 || !inputs.adm_1 || inputs.adm_level < 2) return;

    setCitiesLoading(true);
    try {
      const params = new URLSearchParams({
        category: category,
        adm_level: inputs.adm_level.toString(),
        disease: inputs.disease,
        country: inputs.adm_0,
        state: inputs.adm_1,
        sprint: inputs.sprint.toString(),
      });

      const res = await fetch(`/api/vis/dashboard/cities?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch cities");

      const data: CityOption[] = await res.json();
      setCityOptions(data);

      if (data.length > 0) {
        setInputs((prev) => {
          const currentIsValid = data.some((c) => c.geocode === prev.adm_2);
          if (!currentIsValid || !prev.adm_2) {
            const defaultCity = data[0].geocode;
            updateURL({ adm_2: defaultCity });
            return { ...prev, adm_2: defaultCity };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error(error);
      setCityOptions([]);
    } finally {
      setCitiesLoading(false);
    }
  }, [category, inputs.adm_level, inputs.disease, inputs.adm_0, inputs.adm_1, inputs.sprint, updateURL]);

  const fetchSprints = useCallback(async () => {
    if (!inputs.disease) return;

    setSprintsLoading(true);
    try {
      const params = new URLSearchParams({
        category: category,
        adm_level: inputs.adm_level.toString(),
        disease: inputs.disease,
        sprint: inputs.sprint.toString(),
      });

      if (inputs.adm_0) params.append("country", inputs.adm_0);
      if (inputs.adm_1 && inputs.adm_level >= 1) params.append("state", inputs.adm_1);
      if (inputs.adm_2 && inputs.adm_level >= 2) params.append("city", inputs.adm_2);

      const res = await fetch(`/api/vis/dashboard/sprints?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch sprints");

      const data: SprintOption[] = await res.json();
      setSprintOptions(data);
      setSelectedSprints([]);
    } catch (error) {
      console.error(error);
      setSprintOptions([]);
    } finally {
      setSprintsLoading(false);
    }
  }, [category, inputs.adm_level, inputs.disease, inputs.adm_0, inputs.adm_1, inputs.adm_2, inputs.sprint]);

  const fetchPredictions = useCallback(async () => {
    if (!inputs.disease) return;

    setPredictionsLoading(true);
    try {
      const params = new URLSearchParams({
        category: category,
        adm_level: inputs.adm_level.toString(),
        disease: inputs.disease,
        sprint: inputs.sprint.toString(),
      });

      if (inputs.adm_0) params.append("country", inputs.adm_0);
      if (inputs.adm_1 && inputs.adm_level >= 1) params.append("state", inputs.adm_1);
      if (inputs.adm_2 && inputs.adm_level >= 2) params.append("city", inputs.adm_2);

      const res = await fetch(`/api/vis/dashboard/predictions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch predictions");

      const data: Prediction[] = await res.json();
      setPredictions(data);
      setChartPredictions([]);
      setLoadingPredictions([]);
      setSelectedModels([]);
      setActiveIntervals(new Set());
      setCurrentPage(1);
    } catch (error) {
      console.error(error);
      setPredictions([]);
    } finally {
      setPredictionsLoading(false);
    }
  }, [category, inputs.adm_level, inputs.disease, inputs.adm_0, inputs.adm_1, inputs.adm_2, inputs.sprint]);


  const fetchData = useCallback(async () => {
    if (!inputs.disease) return;
    if (!inputs.adm_0) return;
    if (inputs.adm_level >= 1 && !inputs.adm_1) return;
    if (inputs.adm_level >= 2 && !inputs.adm_2) return;

    let startStr = "";
    let endStr = "";

    if (predictions.length > 0) {
      const starts = predictions.map(p => p.start).filter(Boolean);
      const ends = predictions.map(p => p.end).filter(Boolean);

      if (starts.length > 0 && ends.length > 0) {
        startStr = starts.reduce((a, b) => (a < b ? a : b));
        endStr = ends.reduce((a, b) => (a > b ? a : b));
      }
    }

    if (!startStr || !endStr) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        disease: inputs.disease,
        adm_level: inputs.adm_level.toString(),
        sprint: inputs.sprint.toString(),
        adm_0: inputs.adm_0,
        start: startStr,
        end: endStr
      });

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
  }, [inputs, predictions]);

  useEffect(() => {
    const levelParam = searchParams.get("adm_level");
    const sprintParam = searchParams.get("sprint") === "true";

    setInputs((prev) => {
      const newLevel = levelParam !== null ? Number(levelParam) : prev.adm_level;
      if (newLevel !== prev.adm_level || sprintParam !== prev.sprint) {
        return { ...prev, adm_level: newLevel, sprint: sprintParam };
      }
      return prev;
    });
  }, [searchParams]);

  useEffect(() => {
    fetchDiseases();
  }, [fetchDiseases]);

  useEffect(() => {
    if (inputs.disease) {
      fetchCountries();
    }
  }, [fetchCountries, inputs.disease]);

  useEffect(() => {
    if (inputs.disease && inputs.adm_0) {
      fetchStates();
    }
  }, [fetchStates, inputs.disease, inputs.adm_0]);

  useEffect(() => {
    if (inputs.disease && inputs.adm_0 && inputs.adm_1) {
      fetchCities();
    }
  }, [fetchCities, inputs.disease, inputs.adm_0, inputs.adm_1]);

  useEffect(() => {
    if (inputs.disease) {
      fetchSprints();
    }
  }, [fetchSprints, inputs.disease, inputs.adm_0, inputs.adm_1, inputs.adm_2]);

  useEffect(() => {
    if (inputs.disease) {
      fetchPredictions();
    }
  }, [fetchPredictions, inputs.disease, inputs.adm_0, inputs.adm_1, inputs.adm_2]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSprints, selectedModels, predictionSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    setInputs((prev) => ({ ...prev, [name]: newValue }));

    if (name === 'disease' || name === 'adm_0' || name === 'adm_1' || name === 'adm_2') {
      setPredictions([]);
      setChartPredictions([]);
      setChartData({ labels: [], data: [] });
      setActiveIntervals(new Set());
    }

    updateURL({ [name]: newValue });
  };

  const toggleSprint = (sprintYear: number) => {
    setSelectedSprints((prev) =>
      prev.includes(sprintYear)
        ? prev.filter((year) => year !== sprintYear)
        : [...prev, sprintYear]
    );
  };

  const toggleModel = (modelName: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelName)
        ? prev.filter((name) => name !== modelName)
        : [...prev, modelName]
    );
  };

  const toggleInterval = (predictionId: number) => {
    setActiveIntervals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(predictionId)) {
        newSet.delete(predictionId);
      } else {
        newSet.add(predictionId);
      }
      return newSet;
    });
  };

  const togglePrediction = async (prediction: Prediction) => {
    const isSelected = chartPredictions.some((p) => p.id === prediction.id);

    if (isSelected) {
      setChartPredictions((prev) => prev.filter((p) => p.id !== prediction.id));
      setActiveIntervals((prev) => {
        const newSet = new Set(prev);
        newSet.delete(prediction.id);
        return newSet;
      });
    } else {
      setLoadingPredictions((prev) => [...prev, prediction.id]);
      try {
        const res = await fetch(`/api/vis/dashboard/prediction/${prediction.id}`);
        if (!res.ok) throw new Error("Failed to fetch prediction data");
        const data: PredictionRowData[] = await res.json();

        const newPrediction: QuantitativePrediction = {
          id: prediction.id,
          color: CHART_COLORS[prediction.id % CHART_COLORS.length],
          data: {
            labels: data.map((d) => new Date(d.date)),
            data: data.map((d) => d.pred),
            lower_50: data.map((d) => d.lower_50 ?? null),
            lower_80: data.map((d) => d.lower_80 ?? null),
            lower_90: data.map((d) => d.lower_90 ?? null),
            lower_95: data.map((d) => d.lower_95 ?? null),
            upper_50: data.map((d) => d.upper_50 ?? null),
            upper_80: data.map((d) => d.upper_80 ?? null),
            upper_90: data.map((d) => d.upper_90 ?? null),
            upper_95: data.map((d) => d.upper_95 ?? null),
          },
        };

        setChartPredictions((prev) => [...prev, newPrediction]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingPredictions((prev) => prev.filter((id) => id !== prediction.id));
      }
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const isConfigLoading = diseasesLoading || countriesLoading || statesLoading || citiesLoading || sprintsLoading;

  const uniqueModels = useMemo(() => {
    let baseList = predictions;
    if (selectedSprints.length > 0) {
      baseList = baseList.filter((p) => p.sprint && selectedSprints.includes(p.sprint));
    }
    const models = Array.from(new Set(baseList.map((p) => p.repository))).sort();

    if (modelSearch.trim() !== "") {
      return models.filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()));
    }

    return models;
  }, [predictions, selectedSprints, modelSearch]);

  const filteredAndSortedPredictions = useMemo(() => {
    let result = predictions;

    if (selectedSprints.length > 0) {
      result = result.filter((p) => p.sprint && selectedSprints.includes(p.sprint));
    }

    if (selectedModels.length > 0) {
      result = result.filter((p) => selectedModels.includes(p.repository));
    }

    if (predictionSearch.trim() !== "") {
      const query = predictionSearch.toLowerCase();
      result = result.filter(p =>
        p.id.toString().includes(query) ||
        p.owner.toLowerCase().includes(query) ||
        p.repository.toLowerCase().includes(query) ||
        p.start.toLowerCase().includes(query) ||
        p.end.toLowerCase().includes(query)
      );
    }

    const selectedIds = new Set(chartPredictions.map((p) => p.id));

    result = [...result].sort((a, b) => {
      const isSelectedA = selectedIds.has(a.id);
      const isSelectedB = selectedIds.has(b.id);

      if (isSelectedA && !isSelectedB) return -1;
      if (!isSelectedA && isSelectedB) return 1;

      if (sortConfig.key) {
        const scoreA = a.scores.find((s) => s.name === sortConfig.key)?.score;
        const scoreB = b.scores.find((s) => s.name === sortConfig.key)?.score;

        if (scoreA === undefined && scoreB === undefined) return 0;
        if (scoreA === undefined) return 1;
        if (scoreB === undefined) return -1;

        if (scoreA < scoreB) return sortConfig.direction === "asc" ? -1 : 1;
        if (scoreA > scoreB) return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return result;
  }, [predictions, selectedSprints, selectedModels, sortConfig, chartPredictions, predictionSearch]);

  const paginatedPredictions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedPredictions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedPredictions, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedPredictions.length / ITEMS_PER_PAGE);

  const handleSelectAll = async () => {
    const unselectedPredictions = filteredAndSortedPredictions.filter(
      p => !chartPredictions.some(cp => cp.id === p.id)
    ).slice(0, 10);

    if (unselectedPredictions.length === 0) return;

    const idsToLoad = unselectedPredictions.map(p => p.id);
    setLoadingPredictions(prev => [...prev, ...idsToLoad]);

    try {
      const results = await Promise.all(
        unselectedPredictions.map(async (prediction) => {
          try {
            const res = await fetch(`/api/vis/dashboard/prediction/${prediction.id}`);
            if (!res.ok) return null;
            const data: PredictionRowData[] = await res.json();

            const newPrediction: QuantitativePrediction = {
              id: prediction.id,
              color: CHART_COLORS[prediction.id % CHART_COLORS.length],
              data: {
                labels: data.map((d) => new Date(d.date)),
                data: data.map((d) => d.pred),
                lower_50: data.map((d) => d.lower_50 ?? null),
                lower_80: data.map((d) => d.lower_80 ?? null),
                lower_90: data.map((d) => d.lower_90 ?? null),
                lower_95: data.map((d) => d.lower_95 ?? null),
                upper_50: data.map((d) => d.upper_50 ?? null),
                upper_80: data.map((d) => d.upper_80 ?? null),
                upper_90: data.map((d) => d.upper_90 ?? null),
                upper_95: data.map((d) => d.upper_95 ?? null),
              },
            };
            return newPrediction;
          } catch (e) {
            return null;
          }
        })
      );

      const validResults = results.filter((r): r is QuantitativePrediction => r !== null);
      setChartPredictions(prev => [...prev, ...validResults]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingPredictions(prev => prev.filter(id => !idsToLoad.includes(id)));
    }
  };

  const handleClearAll = () => {
    setChartPredictions([]);
    setActiveIntervals(new Set());
  };

  return (
    <div className="relative space-y-6 min-h-[500px] max-w-full">
      {isConfigLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-lg">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      )}

      <div className="bg-white rounded shadow">
        <div className="flex flex-wrap gap-4 p-4">
          <div className="flex-1 flex flex-wrap gap-4 min-w-[300px]">
            <div className="flex flex-col flex-1 min-w-[150px]">
              <label className="text-sm font-semibold mb-1">Disease</label>
              <select
                name="disease"
                value={inputs.disease}
                onChange={handleChange}
                disabled={diseaseOptions.length === 0}
                className="border p-2 rounded disabled:bg-gray-100"
              >
                {diseaseOptions.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col flex-1 min-w-[150px]">
              <label className="text-sm font-semibold mb-1">Country</label>
              <select
                name="adm_0"
                value={inputs.adm_0}
                onChange={handleChange}
                disabled={countryOptions.length === 0}
                className="border p-2 rounded disabled:bg-gray-100"
              >
                {countryOptions.map((c) => (
                  <option key={c.geocode} value={c.geocode}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {inputs.adm_level >= 1 && (
              <div className="flex flex-col flex-1 min-w-[150px]">
                <label className="text-sm font-semibold mb-1">State</label>
                <select
                  name="adm_1"
                  value={inputs.adm_1}
                  onChange={handleChange}
                  disabled={stateOptions.length === 0}
                  className="border p-2 rounded disabled:bg-gray-100"
                >
                  {stateOptions.map((s) => (
                    <option key={s.geocode} value={s.geocode}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {inputs.adm_level >= 2 && (
              <div className="flex flex-col flex-1 min-w-[150px]">
                <label className="text-sm font-semibold mb-1">City</label>
                <select
                  name="adm_2"
                  value={inputs.adm_2}
                  onChange={handleChange}
                  disabled={cityOptions.length === 0}
                  className="border p-2 rounded disabled:bg-gray-100"
                >
                  {cityOptions.map((c) => (
                    <option key={c.geocode} value={c.geocode}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {sprintOptions.length > 0 && (
            <div className="w-full md:w-auto md:w-72 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-4 flex flex-col gap-2">
              <h3 className="text-sm font-semibold mb-1">IMDC</h3>
              <div className="flex flex-wrap gap-2">
                {sprintOptions.map((sprint) => {
                  const isSelected = selectedSprints.includes(sprint.year);
                  return (
                    <button
                      key={sprint.id}
                      onClick={() => toggleSprint(sprint.year)}
                      className={`px-2 py-1 rounded text-xs border transition-colors ${isSelected
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                    >
                      {sprint.year}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow h-[500px]">
        {inputs.disease ? (
          <LineChart
            data={chartData}
            predictions={chartPredictions}
            activeIntervals={activeIntervals}
            height="100%"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Please select a disease to view data.
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded shadow">
        <div className="flex flex-col md:flex-row gap-6">

          <div className="w-full md:w-64 flex-shrink-0 border-r pr-4">
            <h3 className="text-lg font-bold mb-4">Models</h3>

            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search models..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {modelSearch && (
                <button
                  onClick={() => setModelSearch("")}
                  className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {uniqueModels.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No models available</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                {uniqueModels.map((model) => {
                  const isSelected = selectedModels.includes(model);
                  return (
                    <button
                      key={model}
                      onClick={() => toggleModel(model)}
                      className={`text-left text-xs px-3 py-2 rounded transition-colors border ${isSelected
                        ? "bg-blue-50 text-blue-700 border-blue-200 font-medium"
                        : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100"
                        }`}
                    >
                      {model}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Predictions</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                  title="Select 10 predictions"
                >
                  Select 10
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                  title="Clear all selections"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search predictions by ID, Owner, Model or Year..."
                value={predictionSearch}
                onChange={(e) => setPredictionSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {predictionSearch && (
                <button
                  onClick={() => setPredictionSearch("")}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {predictionsLoading ? (
              <div className="text-sm text-gray-500">Loading predictions...</div>
            ) : filteredAndSortedPredictions.length === 0 ? (
              <div className="text-sm text-gray-500">No predictions found.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 w-[40%]">Model</th>
                        <th className="px-3 py-2 text-center w-[10%]">Interval Bounds</th>
                        {SCORE_COLUMNS.map((col) => (
                          <th
                            key={col.key}
                            className="px-3 py-2 text-right cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort(col.key)}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {col.label}
                              {sortConfig.key === col.key ? (
                                sortConfig.direction === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                              ) : (
                                <ArrowUpDown size={14} className="text-gray-300" />
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPredictions.map((p) => {
                        const selectedPred = chartPredictions.find(cp => cp.id === p.id);
                        const isSelected = !!selectedPred;
                        const isLoading = loadingPredictions.includes(p.id);
                        const rowStyle = isSelected ? { backgroundColor: `${selectedPred.color}20` } : undefined;

                        return (
                          <tr
                            key={p.id}
                            className={`border-b cursor-pointer transition-colors ${!isSelected && 'hover:bg-gray-50'}`}
                            onClick={() => togglePrediction(p)}
                            style={rowStyle}
                          >
                            <td className="px-3 py-2">
                              <div className="flex items-start gap-3">
                                <div className="text-xs font-mono text-gray-500 mt-1 min-w-[30px]">
                                  {isLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                  ) : (
                                    `#${p.id}`
                                  )}
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="flex gap-2 items-center">
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded border border-blue-200 font-mono">
                                      {p.owner}
                                    </span>
                                    <a
                                      href={`/${p.owner}/${p.repository}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded border border-gray-200 font-mono hover:bg-gray-200 hover:underline transition-colors"
                                    >
                                      {p.repository}
                                    </a>
                                  </div>
                                  <div className="text-xs text-gray-500 flex gap-2 items-center">
                                    <span>{p.start} - {p.end}</span>
                                    {p.sprint && (
                                      <span className="px-2 py-0.5 bg-gray-200 rounded-full text-[10px]">
                                        IMDC {p.sprint}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => toggleInterval(p.id)}
                                disabled={!isSelected}
                                className={`p-1 rounded transition-colors ${isSelected
                                  ? activeIntervals.has(p.id)
                                    ? "text-blue-600 hover:bg-blue-100"
                                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                  : "text-gray-200 cursor-not-allowed"
                                  }`}
                                title="Toggle Confidence Intervals"
                              >
                                {activeIntervals.has(p.id) ? <Eye size={16} /> : <EyeOff size={16} />}
                              </button>
                            </td>
                            {SCORE_COLUMNS.map((col) => {
                              const score = p.scores.find((s) => s.name === col.key);
                              return (
                                <td key={col.key} className="px-3 py-2 text-right font-mono text-gray-700">
                                  {score ? score.score.toFixed(2) : "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-4 border-t pt-3">
                  <div className="text-xs text-gray-500">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedPredictions.length)} of {filteredAndSortedPredictions.length}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center px-2 text-xs font-medium">
                      Page {currentPage} of {totalPages}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
