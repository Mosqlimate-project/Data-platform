import { useEffect, useRef } from "react";
import * as echarts from "echarts";

const watermarkGraphic = {
  type: 'image',
  top: 30,
  right: 30,
  z: 0,
  bounding: 'raw',
  style: {
    image: '/watermark.png',
    width: 100,
    height: 100,
    opacity: 0.3,
  }
};

export function useChart(options: echarts.EChartsOption | null, loading: boolean) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);

      const handleResize = () => chartInstance.current?.resize();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [options, loading]);

  useEffect(() => {
    if (!chartInstance.current) return;

    if (loading) {
      chartInstance.current.showLoading();
    } else {
      chartInstance.current.hideLoading();
      if (options) {
        const finalOptions = {
          ...options,
          graphic: [
            ...(Array.isArray(options.graphic) ? options.graphic : [options.graphic].filter(Boolean)),
            watermarkGraphic
          ]
        };

        chartInstance.current.setOption(finalOptions, { notMerge: true });
        chartInstance.current.resize();
      }
    }
  }, [loading, options]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  return chartRef;
}
