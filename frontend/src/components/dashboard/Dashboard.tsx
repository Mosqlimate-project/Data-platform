"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Series, QuantitativePrediction } from "@/components/dashboard/QuantitativeLineChart";
import { Loader2 } from "lucide-react";
import { useDashboard } from "@/context/Dashboard";
import {
  fetchTree,
  fetchSprints,
  fetchPredictions,
  fetchCases,
  fetchPredictionData,
  fetchPredictionMetadata,
  type TreeData,
  type Prediction,
  type DiseaseOption,
  type Option,
  type SprintOption,
  type AdmLevel,
  type CaseDefinition,
} from "@/lib/dashboard/api";
import DashboardChart from "./Chart";
import DashboardPredictions from "./Predictions";
import DashboardParameters from "./Parameters";

export const dynamic = "force-dynamic";

interface DashboardClientProps {
  category: "quantitative" | "categorical";
}

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
  const { state: inputs, updateState: setInputs } = useDashboard();

  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<Series>({ labels: [], data: [] });
  const [chartPredictions, setChartPredictions] = useState<QuantitativePrediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState<number[]>([]);

  const [globalIntervals, setGlobalIntervals] = useState<Set<string>>(new Set(["50", "90"]));
  const [visibleBounds, setVisibleBounds] = useState<Set<number>>(new Set());

  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [diseaseOptions, setDiseaseOptions] = useState<DiseaseOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<Option[]>([]);
  const [stateOptions, setStateOptions] = useState<Option[]>([]);
  const [cityOptions, setCityOptions] = useState<Option[]>([]);
  const [sprintOptions, setSprintOptions] = useState<SprintOption[]>([]);

  const [treeLoading, setTreeLoading] = useState(true);
  const [predictionsLoading, setPredictionsLoading] = useState(false);

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [availableCaseDefinitions, setAvailableCaseDefinitions] = useState<Set<CaseDefinition>>(new Set(["reported", "probable"]));
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedSprints, setSelectedSprints] = useState<number[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const [predictionSearch, setPredictionSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const initialPredId = useRef<string | null>(inputs.prediction_id);
  const requestRef = useRef(0);
  const chartRequestRef = useRef(0);

  function treeSectionOptions<T extends { code?: string; geocode?: string }>(
    section: Record<string, T[]>,
    prefixParts: string[],
    sprint: boolean,
  ): T[] {
    const prefix = prefixParts.join("|");
    if (!sprint) {
      return section[`${prefix}|none`] || [];
    }
    const seen = new Set<string>();
    const result: T[] = [];
    for (const [key, items] of Object.entries(section)) {
      if (key.startsWith(`${prefix}|`) && !key.endsWith("|none")) {
        for (const item of items) {
          const id = item.code ?? item.geocode;
          if (id != null && !seen.has(id)) {
            seen.add(id);
            result.push(item);
          }
        }
      }
    }
    return result;
  }

  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc";
  }>({ key: "wis_score", direction: "asc" });

  useEffect(() => {
    fetchTree().then((data) => {
      setTreeData(data);
      setTreeLoading(false);
    });
  }, []);

  const toggleGlobalInterval = useCallback((interval: string) => {
    setGlobalIntervals(prev => {
      const next = new Set(prev);
      if (next.has(interval)) next.delete(interval);
      else next.add(interval);
      return next;
    });
  }, []);

  const toggleIndividualVisibility = useCallback((predictionId: number) => {
    setVisibleBounds(prev => {
      const next = new Set(prev);
      if (next.has(predictionId)) next.delete(predictionId);
      else next.add(predictionId);
      return next;
    });
  }, []);

  const loadSinglePredictionData = useCallback(async (predictionId: number) => {
    setLoadingPredictions(prev => [...prev, predictionId]);
    try {
      const data = await fetchPredictionData(predictionId);
      const newPrediction: QuantitativePrediction = {
        id: predictionId, color: CHART_COLORS[predictionId % CHART_COLORS.length],
        data: {
          labels: data.map(d => new Date(d.date)),
          data: data.map(d => d.pred),
          lower_50: data.map(d => d.lower_50 ?? null),
          lower_80: data.map(d => d.lower_80 ?? null),
          lower_90: data.map(d => d.lower_90 ?? null),
          lower_95: data.map(d => d.lower_95 ?? null),
          upper_50: data.map(d => d.upper_50 ?? null),
          upper_80: data.map(d => d.upper_80 ?? null),
          upper_90: data.map(d => d.upper_90 ?? null),
          upper_95: data.map(d => d.upper_95 ?? null),
        },
      };
      setChartPredictions(prev =>
        prev.some(p => p.id === predictionId) ? prev : [...prev, newPrediction]
      );
    } finally {
      setLoadingPredictions(prev => prev.filter(id => id !== predictionId));
    }
  }, []);

  const syncPredictions = useCallback(async (requestId: number) => {
    setPredictionsLoading(true);
    try {
      const otherDef: CaseDefinition = inputs.case_definition === "reported" ? "probable" : "reported";
      const [sprints, preds, otherPreds] = await Promise.all([
        fetchSprints(category, inputs.adm_level, inputs.disease, inputs.adm_0, inputs.adm_1, inputs.adm_2),
        fetchPredictions(category, inputs.adm_level, inputs.disease, inputs.case_definition, inputs.adm_0, inputs.adm_1, inputs.adm_2, inputs.sprint),
        !inputs.sprint
          ? fetchPredictions(category, inputs.adm_level, inputs.disease, otherDef, inputs.adm_0, inputs.adm_1, inputs.adm_2, inputs.sprint).catch(() => [] as Prediction[])
          : Promise.resolve([] as Prediction[]),
      ]);
      if (requestRef.current !== requestId) return;

      if (!inputs.sprint) {
        const newAvailable = new Set<CaseDefinition>();
        if (preds.length > 0) newAvailable.add(inputs.case_definition);
        if (otherPreds.length > 0) newAvailable.add(otherDef);
        setAvailableCaseDefinitions(newAvailable);

        if (preds.length === 0 && otherPreds.length > 0) {
          setPredictions([]);
          setSprintOptions(sprints);
          setInputs({ case_definition: otherDef });
          return;
        }
      }

      setSprintOptions(sprints);
      setPredictions(preds);
      if (preds.length > 0 && !initialPredId.current) {
        setChartPredictions(prev => {
          const sorted = [...preds].sort((a, b) => {
            const scA = a.scores.find(s => s.name === "wis_score")?.score ?? null;
            const scB = b.scores.find(s => s.name === "wis_score")?.score ?? null;
            if (scA === null && scB === null) return 0;
            if (scA === null) return 1;
            if (scB === null) return -1;
            return scA - scB;
          });
          const existingIds = new Set(prev.map(p => p.id));
          const firstFive = sorted.slice(0, 5);
          const toLoad = firstFive.filter(p => !existingIds.has(p.id));
          toLoad.forEach(p => loadSinglePredictionData(p.id));
          return prev;
        });
      }
    } finally {
      if (requestRef.current === requestId) setPredictionsLoading(false);
    }
  }, [category, inputs.adm_level, inputs.disease, inputs.adm_0, inputs.adm_1, inputs.adm_2, inputs.case_definition, inputs.sprint, loadSinglePredictionData]);

  useEffect(() => {
    if (!treeData) return;

    const requestId = ++requestRef.current;

    const runInitialization = async () => {
      let { disease: d, adm_0: a0, adm_1: a1, adm_2: a2 } = inputs;
      let useMetadata = false;

      if (initialPredId.current) {
        try {
          const meta = await fetchPredictionMetadata(initialPredId.current);
          if (requestRef.current !== requestId) return;
          d = meta.disease_code;
          a0 = meta.adm_0_code || a0;
          a1 = meta.adm_1_code || a1;
          a2 = meta.adm_2_code || a2;
          useMetadata = true;

          if (meta.adm_level !== inputs.adm_level || meta.sprint !== inputs.sprint) {
            setInputs({ disease: d, adm_level: meta.adm_level as AdmLevel, sprint: meta.sprint, adm_0: a0, adm_1: a1, adm_2: a2 });
            return;
          }
        } catch {
          if (requestRef.current !== requestId) return;
        }
      }

      const diseases = treeSectionOptions(treeData.diseases, [category, String(inputs.adm_level)], inputs.sprint) as DiseaseOption[];
      if (requestRef.current !== requestId) return;
      setDiseaseOptions(diseases);
      if (!useMetadata) {
        if (diseases.length > 0 && !d) d = diseases[0].code;
        else if (diseases.length > 0 && !diseases.some((x) => x.code === d)) d = diseases[0].code;
      }

      if (useMetadata && !a0 && a2 && inputs.adm_level >= 2) {
        const countryEntries = treeSectionOptions(treeData.countries, [category, String(inputs.adm_level), d], inputs.sprint) as Option[];
        for (const country of countryEntries) {
          const stateEntries = treeSectionOptions(treeData.states, [category, String(inputs.adm_level), d, country.geocode], inputs.sprint) as Option[];
          for (const state of stateEntries) {
            const cityEntries = treeSectionOptions(treeData.cities, [category, "2", d, country.geocode, state.geocode], inputs.sprint) as Option[];
            if (cityEntries.some(c => c.geocode === a2)) {
              a0 = country.geocode;
              a1 = state.geocode;
              break;
            }
          }
          if (a0) break;
        }
      } else if (useMetadata && a0 && !a1 && a2 && inputs.adm_level >= 2) {
        const stateEntries = treeSectionOptions(treeData.states, [category, String(inputs.adm_level), d, a0], inputs.sprint) as Option[];
        for (const state of stateEntries) {
          const cityEntries = treeSectionOptions(treeData.cities, [category, "2", d, a0, state.geocode], inputs.sprint) as Option[];
          if (cityEntries.some(c => c.geocode === a2)) {
            a1 = state.geocode;
            break;
          }
        }
      }

      if (d) {
        const countries = treeSectionOptions(treeData.countries, [category, String(inputs.adm_level), d], inputs.sprint) as Option[];
        if (requestRef.current !== requestId) return;
        setCountryOptions(countries);
        if (!useMetadata) {
          if (countries.length > 0 && !a0) {
            if (a1 && inputs.adm_level >= 1) {
              for (const country of countries) {
                const stateOptions = treeSectionOptions(treeData.states, [category, String(inputs.adm_level), d, country.geocode], inputs.sprint) as Option[];
                if (stateOptions.some(s => s.geocode === a1)) {
                  a0 = country.geocode;
                  break;
                }
              }
            }
            if (!a0) a0 = countries[0].geocode;
          } else if (countries.length > 0 && !countries.some((x) => x.geocode === a0)) a0 = countries[0].geocode;
        }
      } else {
        setCountryOptions([]);
      }

      if (d && a0 && inputs.adm_level >= 1) {
        const states = treeSectionOptions(treeData.states, [category, String(inputs.adm_level), d, a0], inputs.sprint) as Option[];
        if (requestRef.current !== requestId) return;
        setStateOptions(states);
        if (!useMetadata) {
          if (states.length > 0 && !a1) a1 = states[0].geocode;
          else if (states.length > 0 && !states.some((x) => x.geocode === a1)) a1 = states[0].geocode;
        }
      } else {
        setStateOptions([]);
      }

      if (d && a0 && a1 && inputs.adm_level >= 2) {
        const cities = treeSectionOptions(treeData.cities, [category, "2", d, a0, a1], inputs.sprint) as Option[];
        if (requestRef.current !== requestId) return;
        setCityOptions(cities);
        if (!useMetadata) {
          if (cities.length > 0 && !a2) a2 = cities[0].geocode;
          else if (cities.length > 0 && !cities.some((x) => x.geocode === a2)) a2 = cities[0].geocode;
        }
      } else {
        setCityOptions([]);
      }

      if (d !== inputs.disease || a0 !== inputs.adm_0 || a1 !== inputs.adm_1 || a2 !== inputs.adm_2) {
        setInputs({ disease: d, adm_0: a0, adm_1: a1, adm_2: a2 });
        return;
      }

      await syncPredictions(requestId);

      if (initialPredId.current) {
        const targetId = parseInt(initialPredId.current);
        await loadSinglePredictionData(targetId);
        initialPredId.current = null;
        setInputs({ prediction_id: null });
      }
    };

    setChartPredictions([]);
    setVisibleBounds(new Set());
    runInitialization();
  }, [treeData, category, inputs.adm_level, inputs.sprint, inputs.disease, inputs.adm_0, inputs.adm_1, inputs.adm_2, inputs.case_definition]);

  const loadChartData = useCallback(async () => {
    const requestId = ++chartRequestRef.current;
    if (!inputs.disease || !inputs.adm_0 || predictions.length === 0) return;

    const starts = predictions.map(p => p.start).filter(Boolean);
    const ends = predictions.map(p => p.end).filter(Boolean);
    if (!starts.length || !ends.length) return;

    const startStr = starts.reduce((a, b) => (a < b ? a : b));
    const endStr = ends.reduce((a, b) => (a > b ? a : b));

    setLoading(true);
    try {
      const data = await fetchCases(
        inputs.disease,
        inputs.adm_level,
        inputs.sprint,
        inputs.case_definition,
        startStr,
        endStr,
        inputs.adm_0,
        inputs.adm_1,
        inputs.adm_2
      );
      if (requestId !== chartRequestRef.current) return;
      setChartData({ labels: data.map(d => new Date(d.date)), data: data.map(d => d.cases) });
    } catch {
      if (requestId === chartRequestRef.current) setChartData({ labels: [], data: [] });
    } finally {
      if (requestId === chartRequestRef.current) setLoading(false);
    }
  }, [inputs.disease, inputs.adm_0, inputs.adm_1, inputs.adm_2, inputs.adm_level, inputs.case_definition, inputs.sprint, predictions]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  const filteredAndSortedPredictions = useMemo(() => {
    let result = predictions;
    if (selectedSprints.length > 0) result = result.filter(p => p.sprint && selectedSprints.includes(p.sprint));
    if (!inputs.sprint) result = result.filter(p => p.case_definition === inputs.case_definition);
    if (selectedModels.length > 0) result = result.filter(p => selectedModels.includes(p.repository));
    if (predictionSearch.trim() !== "") {
      const q = predictionSearch.toLowerCase();
      result = result.filter(p =>
        p.id.toString().includes(q) ||
        p.owner.toLowerCase().includes(q) ||
        p.repository.toLowerCase().includes(q)
      );
    }
    const selectedIds = new Set(chartPredictions.map(p => p.id));
    return [...result].sort((a, b) => {
      const sA = selectedIds.has(a.id), sB = selectedIds.has(b.id);
      if (sA && !sB) return -1;
      if (!sA && sB) return 1;
      if (sortConfig.key) {
        const scA = a.scores.find(s => s.name === sortConfig.key)?.score ?? null;
        const scB = b.scores.find(s => s.name === sortConfig.key)?.score ?? null;
        if (scA === null && scB === null) return 0;
        if (scA === null) return 1;
        if (scB === null) return -1;
        return sortConfig.direction === "asc" ? scA - scB : scB - scA;
      }
      return 0;
    });
  }, [predictions, selectedSprints, selectedModels, sortConfig, chartPredictions, predictionSearch, inputs.sprint, inputs.case_definition]);

  const uniqueModels = useMemo(() => {
    let result = predictions;
    if (selectedSprints.length > 0) {
      result = result.filter(p => p.sprint && selectedSprints.includes(p.sprint));
    }
    if (!inputs.sprint) {
      result = result.filter(p => p.case_definition === inputs.case_definition);
    }
    return Array.from(new Set(result.map(p => p.repository))).sort();
  }, [predictions, selectedSprints, inputs.sprint, inputs.case_definition]);

  useEffect(() => {
    setSelectedModels(prev => prev.filter(model => uniqueModels.includes(model)));
  }, [uniqueModels]);

  const isConfigLoading = treeLoading;

  return (
    <div className="p-4 relative space-y-6 min-h-[500px] max-w-full">
      {isConfigLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg/60 backdrop-blur-[1px] rounded-lg">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      )}

      <DashboardParameters
        isConfigLoading={isConfigLoading}
        inputs={inputs}
        availableCaseDefinitions={availableCaseDefinitions}
        handleChange={(e) => {
          const { name, value } = e.target;
          const updates: any = { ...inputs, [name]: value };
          if (name === "disease") { updates.adm_0 = ""; updates.adm_1 = ""; updates.adm_2 = ""; }
          else if (name === "adm_0") { updates.adm_1 = ""; updates.adm_2 = ""; }
          else if (name === "adm_1") { updates.adm_2 = ""; }
          setInputs(updates);
        }}
        handleCaseDefinitionChange={(def) => setInputs({ case_definition: def as any })}
        toggleSprint={(year) => setSelectedSprints(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year])}
        selectedSprints={selectedSprints}
        diseaseOptions={diseaseOptions}
        countryOptions={countryOptions}
        stateOptions={stateOptions}
        cityOptions={cityOptions}
        sprintOptions={sprintOptions}
      />

      <DashboardChart
        disease={inputs.disease}
        sprint={inputs.sprint}
        caseDefinition={inputs.case_definition}
        chartData={chartData}
        chartPredictions={chartPredictions}
        globalIntervals={globalIntervals}
        visibleBounds={visibleBounds}
        isHistoricalLoading={loading}
      />

      <DashboardPredictions
        uniqueModels={uniqueModels.filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()))}
        modelSearch={modelSearch}
        setModelSearch={setModelSearch}
        selectedModels={selectedModels}
        toggleModel={(m) => setSelectedModels(prev => prev.includes(m) ? prev.filter(n => n !== m) : [...prev, m])}
        predictionSearch={predictionSearch}
        setPredictionSearch={setPredictionSearch}
        predictionsLoading={predictionsLoading}
        filteredAndSortedPredictions={filteredAndSortedPredictions}
        paginatedPredictions={filteredAndSortedPredictions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)}
        chartPredictions={chartPredictions}
        loadingPredictions={loadingPredictions}
        globalIntervals={globalIntervals}
        toggleGlobalInterval={toggleGlobalInterval}
        visibleBounds={visibleBounds}
        toggleIndividualVisibility={toggleIndividualVisibility}
        togglePredictionLine={(p) => {
          const isSelected = chartPredictions.some(cp => cp.id === p.id);
          if (isSelected) {
            setChartPredictions(prev => prev.filter(cp => cp.id !== p.id));
          } else {
            loadSinglePredictionData(p.id);
          }
        }}
        handleSort={(key) =>
          setSortConfig(prev => ({
            key,
            direction: prev.key === key ? (prev.direction === "asc" ? "desc" : "asc") : "asc"
          }))
        }
        sortConfig={sortConfig}
        handleSelectAll={async () => {
          const pageItems = filteredAndSortedPredictions.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
          );
          const unselected = pageItems.filter(p => !chartPredictions.some(cp => cp.id === p.id));
          await Promise.all(unselected.map(p => loadSinglePredictionData(p.id)));
        }}
        handleClearAll={() => {
          setChartPredictions([]);
          setVisibleBounds(new Set());
        }}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={Math.ceil(filteredAndSortedPredictions.length / ITEMS_PER_PAGE)}
        itemsPerPage={ITEMS_PER_PAGE}
      />
    </div>
  );
}
