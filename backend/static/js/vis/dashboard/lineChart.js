class LineChart {
  constructor(containerId) {
    this.chart = echarts.init(document.getElementById(containerId));
    this.predictions = {};
    this._zoomTimer = null;
    this.bounds = new Set();

    this.option = {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const p = params.filter(param => !isNaN(param.value));
          if (p.length === 0) return '';

          const date = p[0].axisValue;
          const dataMap = {};

          p.forEach(param => {
            if (param.seriesName.includes("lower_90")) {
              const id = param.seriesName.replace("-lower_90", "");
              if (!dataMap[id]) dataMap[id] = { value: null, lower: param.value, upper: null };
              else dataMap[id].lower = param.value;
            } else if (param.seriesName.includes("upper_90")) {
              const id = param.seriesName.replace("-upper_90", "");
              if (!dataMap[id]) dataMap[id] = { value: null, lower: null, upper: param.value };
              else dataMap[id].upper = param.value;
            } else {
              if (!dataMap[param.seriesName]) dataMap[param.seriesName] = { value: param.value, lower: null, upper: null };
              else dataMap[param.seriesName].value = param.value;
            }
          });

          const casesInfo = Object.entries(dataMap)
            .map(([seriesName, info]) => {
              if (seriesName === "Data") {
                return `${params.find(p => p.seriesName === seriesName)?.marker} Data: ${info.value} cases`;
              }
              if (info.lower !== null && info.upper !== null) {
                return `${params.find(p => p.seriesName === seriesName)?.marker || ''} ${seriesName}: ${info.value} (${info.lower}, ${info.upper}) cases`;
              }
              if (!seriesName.includes("lower") && !seriesName.includes("upper")) {
                return `${params.find(p => p.seriesName === seriesName)?.marker || ''} ${seriesName}: ${info.value} cases`;
              }
              return null;
            })
            .filter(Boolean)
            .join('<br/>');

          return `<strong>${date}</strong><br/>${casesInfo}`;
        }
      },
      legend: {
        top: 15,
      },
      grid: {
        top: '10%',
        bottom: '5%',
        left: '0',
        right: '15px',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: [],
      },
      yAxis: [
        {
          name: '',
          type: 'value',
          nameLocation: 'end',
          nameGap: 18,
          nameRotate: 0,
          nameTextStyle: {
            padding: [0, 0, 5, 100],
            fontWeight: 'bold'
          }
        }
      ],
      series: [
        {
          name: 'Data',
          type: 'line',
          data: [],
          smooth: false,
          symbol: 'circle',
          symbolKeepAspect: true,
          showAllSymbol: true,
          sampling: 'none',
          symbolSize: 5,
          lineStyle: {
            width: 0,
          },
        },
      ],
      graphic: [
        {
          type: 'image',
          right: 10,
          top: 0,
          silent: true,
          style: {
            image: watermark,
            width: 150,
            opacity: 0.3,
          },
          z: 10,
          id: 'watermark'
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          throttle: 50
        },
        {
          type: 'slider',
          show: true,
          bottom: 7,
          height: 30,
        }
      ]
    };

    const self = this;

    this.chart.on('finished', function() {
      self.chart.setOption({
        graphic: {
          type: 'image',
          right: 10,
          top: 0,
          silent: true,
          style: {
            image: watermark,
            width: 150,
            opacity: 0.3,
          },
          z: 10
        }
      });
    });

    this.chart.on('legendselectchanged', (params) => {
      const id = params.name;
      const option = this.option;

      this.chart.dispatchAction({ type: 'legendSelect', name: id });
      this.chart.setOption(this.option, { notMerge: false, replaceMerge: ['series'], animation: false });

      if (id === 'Data') return;

      const hasBounds = option.series.some(
        s => s.name.startsWith(id) && (s.name.includes('lower') || s.name.includes('upper'))
      );

      if (hasBounds) {
        this.removeConfidenceBounds(id);
      } else {
        this.addConfidenceBound(id, '50');
        this.addConfidenceBound(id, '90');
        const pred = this.predictions[id];
        self.zoom(pred.start, pred.end);
      }

      this.chart.setOption(this.option, { notMerge: false, replaceMerge: ['series'], animation: false });
    });

    this.chart.on('click', function(params) {
      if (params.seriesName === "Data") {
        return;
      }
    });

    $('[data-widget="pushmenu"]').on('click', function() {
      setTimeout(() => {
        self.resize();
      }, 350)
    });


    $(".prediction-row").on("mouseenter", function() {
      const index = self.getIndex($(this).data("id"));
      if (index !== -1) {
        self.chart.dispatchAction({
          type: 'highlight',
          seriesIndex: index,
          dataIndex: 0
        });
      }
    });

    $(".prediction-row").on("mouseleave", function() {
      const index = self.getIndex($(this).data("id"));
      if (index !== -1) {
        self.chart.dispatchAction({
          type: 'downplay',
          seriesIndex: index,
          dataIndex: 0
        });
      }
    });

    this.chart.setOption(this.option, { notMerge: false, replaceMerge: ['series'], animation: false });
  }

  updateCases(dates, cases) {
    this.option.xAxis.data = dates;
    this.option.series[0].data = cases;
    this.option.series[0].itemStyle = {
      color: "#000000",
    }
    this.chart.setOption(this.option, { notMerge: false, replaceMerge: ['series'], animation: false });
  }

  addPrediction(prediction) {
    const id = `${prediction.id}`;

    if (!this.predictions[id]) {
      this._addNewPrediction(prediction);
    }
  }

  getIndex(prediction_id) {
    return this.option.series.findIndex((series) => `${series.name}` === `${prediction_id}`);
  }

  removePrediction(prediction_id) {
    const id = `${prediction_id}`;
    this.bounds.delete(id);

    if (this.predictions[id]) {
      const i = this.option.series.findIndex((series) => series.name === id);
      if (i !== -1) {
        this.option.series.splice(i, 1);
        delete this.predictions[id];
      }
      const u50 = this.option.series.findIndex((series) => series.name === `${id}-upper_50`);
      if (u50 !== -1) {
        this.option.series.splice(u50, 1);
      }
      const u90 = this.option.series.findIndex((series) => series.name === `${id}-upper_90`);
      if (u90 !== -1) {
        this.option.series.splice(u90, 1);
      }
      const l50 = this.option.series.findIndex((series) => series.name === `${id}-lower_50`);
      if (l50 !== -1) {
        this.option.series.splice(l50, 1);
      }
      const l90 = this.option.series.findIndex((series) => series.name === `${id}-lower_90`);
      if (l90 !== -1) {
        this.option.series.splice(l90, 1);
      }
    }

    this.chart.setOption(this.option, { notMerge: false, replaceMerge: ['series'], animation: false });
  }

  getMinMaxDates(predictions) {
    const min = new Date(Math.min(...predictions.map(prediction => new Date(prediction.start_date))));
    const max = new Date(Math.max(...predictions.map(prediction => new Date(prediction.end_date))));

    return [min, max]
  }

  clearPredictions() {
    Object.values(this.predictions).map(pred => this.removePrediction(pred.id))
  }

  clear() {
    this.clearPredictions();
    this.option.xAxis.data = [];
    this.option.series[0].data = [];
    this.chart.setOption(this.option, true);
    this._addDefaultText();
  }

  resize(width, height) {
    this.chart.resize(width, height)
  }

  addConfidenceBound(prediction_id, perc = "50") {
    const id = `${prediction_id}`;
    const pred = this.predictions[id];
    const color = pred.color || "#999";
    const option = this.option;
    this.bounds.add(id);

    const dates = pred.chart.labels;
    const lower = pred.chart[`lower_${perc}`];
    const upper = pred.chart[`upper_${perc}`];

    if (!lower || !upper) return;

    const stack = `${id}-${perc}-base`;

    option.series.push({
      name: `${id}-lower_${perc}`,
      type: "line",
      smooth: true,
      data: dates.map((d, i) => [d, lower[i]]),
      lineStyle: { opacity: 0 },
      symbol: "none",
      stack: stack,
      itemStyle: { color },
      tooltip: { show: true, trigger: 'axis' }
    });

    const diff = upper.map((u, i) =>
      u == null || lower[i] == null ? null : u - lower[i]
    );

    option.series.push({
      name: `${id}-upper_${perc}`,
      type: "line",
      smooth: true,
      data: dates.map((d, i) => [d, diff[i]]),
      lineStyle: { opacity: 0 },
      symbol: "none",
      stack: stack,
      areaStyle: {
        color,
        opacity: perc === "50" ? 0.3 : 0.15,
      },
      itemStyle: { color },
      tooltip: { show: true, trigger: 'axis' }
    });

    option.legend.data = option.series
      .filter(s => !s.name.includes("lower") && !s.name.includes("upper"))
      .map(s => ({
        name: s.name,
        textStyle: { fontWeight: this.bounds.has(s.name) ? 'bold' : 'normal' }
      }));

    this.chart.setOption(this.option, { notMerge: false, replaceMerge: ['series'], animation: false });
  }

  removeConfidenceBounds(prediction_id) {
    const id = `${prediction_id}`;
    const option = this.option;
    this.bounds.delete(id);

    option.series = option.series.filter(
      s =>
        !(s.name.startsWith(id) &&
          (s.name.includes("lower") || s.name.includes("upper")))
    );

    option.legend.data = option.series
      .filter(s => !s.name.includes("lower") && !s.name.includes("upper"))
      .map(s => ({
        name: s.name,
        textStyle: { fontWeight: this.bounds.has(s.name) ? 'bold' : 'normal' }
      }));
    this.chart.setOption(this.option, { notMerge: false, replaceMerge: ['series'], animation: false });
  }

  zoom(start, end) {
    const xData = this.option.xAxis.data

    const findClosestIndex = (target) => {
      const targetTime = new Date(target).getTime()
      let closestIndex = 0
      let minDiff = Infinity

      for (let i = 0; i < xData.length; i++) {
        const time = new Date(xData[i]).getTime()
        const diff = Math.abs(time - targetTime)
        if (diff < minDiff) {
          minDiff = diff
          closestIndex = i
        }
      }

      return closestIndex
    }

    const startIndex =
      typeof start === 'string'
        ? xData.indexOf(start) !== -1
          ? xData.indexOf(start)
          : findClosestIndex(start)
        : start

    const endIndex =
      typeof end === 'string'
        ? xData.indexOf(end) !== -1
          ? xData.indexOf(end)
          : findClosestIndex(end)
        : end

    const currentZoom = this.chart.getOption().dataZoom?.[0]
    const currentStart = currentZoom?.startValue
    const currentEnd = currentZoom?.endValue
    const distance = Math.abs(currentStart - startIndex) + Math.abs(currentEnd - endIndex);

    if (currentStart === startIndex && currentEnd === endIndex) {
      return
    }

    if (distance < 3) {
      return;
    }

    this.chart.dispatchAction({
      type: 'dataZoom',
      startValue: startIndex,
      endValue: endIndex
    })
  }


  _addNewPrediction(prediction) {
    const id = `${prediction.id}`;
    const pdata = this.option.xAxis.data.map((label) => {
      const i = prediction.chart.labels.indexOf(label);
      return i !== -1 ? prediction.chart.data[i] : NaN;
    });

    this.predictions[id] = prediction;

    this.option.series.push({
      name: id,
      type: 'line',
      data: pdata,
      smooth: true,
      lineStyle: {
        color: prediction.color,
        width: 2,
      },
      connectNulls: true,
      symbol: 'circle',
      symbolSize: 1,
      itemStyle: {
        color: prediction.color,
      },
    });

    this.chart.setOption(this.option, { notMerge: false, replaceMerge: ['series'], animation: false });
    clearTimeout(this._zoomTimer);
    this._zoomTimer = setTimeout(() => {
      this.zoom(prediction.start, prediction.end);
    }, 300);
  }

  _addDefaultText() {
    this.chart.setOption({
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: 'middle',
          style: {
            text: 'Select Predictions to be visualized',
            fontSize: 20,
            fontWeight: 'bold',
            fill: '#999',
          },
          id: 'default-text'
        }
      ]
    });
  }
}
