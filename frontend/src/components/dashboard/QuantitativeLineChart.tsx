import React, { useEffect, useRef, useMemo } from "react";
import * as echarts from "echarts";

export interface Series {
  labels: Date[];
  data: (number | null)[];
}

export interface PredictionData {
  labels: Date[];
  lower_95?: (number | null)[];
  lower_90: (number | null)[];
  lower_80?: (number | null)[];
  lower_50?: (number | null)[];
  data: (number | null)[];
  upper_50?: (number | null)[];
  upper_80?: (number | null)[];
  upper_90: (number | null)[];
  upper_95?: (number | null)[];
}

export interface QuantitativePrediction {
  id: string | number;
  color: string;
  data: PredictionData;
}

export interface ChartProps {
  data: Series;
  predictions: QuantitativePrediction[];
  height?: string | number;
  width?: string | number;
}

const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const LineChart: React.FC<ChartProps> = ({
  data,
  predictions,
  height = "400px",
  width = "100%",
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const mainLabels = useMemo(() => data.labels.map(formatDate), [data.labels]);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const chartInstance = instanceRef.current;
    const seriesOptions: echarts.SeriesOption[] = [];

    seriesOptions.push({
      name: "Data",
      type: "line",
      data: data.data,
      smooth: false,
      symbol: "circle",
      symbolSize: 6,
      itemStyle: { color: "#000000" },
      lineStyle: {
        width: 0,
      },
      connectNulls: true,
      z: 20,
    });

    predictions.forEach((pred) => {
      const predMap = new Map<string, number | null>();
      pred.data.labels.forEach((date, i) => {
        predMap.set(formatDate(date), pred.data.data[i]);
      });

      const alignedData = mainLabels.map(label => {
        const val = predMap.get(label);
        return val === undefined ? null : val;
      });

      seriesOptions.push({
        name: `Prediction ${pred.id}`,
        type: "line",
        data: alignedData,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          color: pred.color,
          width: 2,
        },
        itemStyle: {
          color: pred.color,
        },
        connectNulls: true,
        z: 30,
      });
    });

    const options: echarts.EChartsOption = {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" }
      },
      legend: {
        top: 10,
        data: ["Data", ...predictions.map(p => `Prediction ${p.id}`)]
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: mainLabels,
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        scale: true,
      },
      series: seriesOptions,
      dataZoom: [
        { type: "inside", throttle: 50 },
        { type: "slider", show: true, height: 20, bottom: 0 }
      ]
    };

    chartInstance.setOption(options, { notMerge: true });

    const handleResize = () => chartInstance.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [data, predictions, mainLabels]);

  return <div ref={chartRef} style={{ width, height }} />;
};
