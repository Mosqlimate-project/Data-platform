class LineChart {
  constructor(containerId) {
    this.chart = echarts.init(document.getElementById(containerId));
    this.predictions = {};
    this.bounds = [];

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
          sampling: 'none',
          symbolSize: 3,
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
      self.chart.setOption({ animation: false });
      self.chart.dispatchAction({ type: 'legendSelect', name: params.name });
      self.chart.setOption({ animation: true });
      if (params.name == 'Data') {
        return
      }
      self.toggleConfidenceBounds(params.name);
    });

    this.chart.on('click', function(params) {
      if (params.seriesName === "Data") {
        return;
      }
      self.toggleConfidenceBounds(params.seriesName);
    });

    $('[data-widget="pushmenu"]').on('click', function() {
      setTimeout(() => {
        $(`#date-picker`).dateRangeSlider("resize");
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

    this.chart.setOption(this.option, true);
  }

  updateCases(dates, cases) {
    this.option.xAxis.data = dates;
    this.option.series[0].data = cases;
    this.option.series[0].itemStyle = {
      color: "#000000",
    }
    this.chart.setOption(this.option, true);
  }

  addPrediction(prediction) {
    const id = `${prediction.id}`;

    if (this.predictions[id]) {
      this._updatePrediction(prediction);
    } else {
      this._addNewPrediction(prediction);
    }
  }

  getIndex(prediction_id) {
    return this.option.series.findIndex((series) => `${series.name}` === `${prediction_id}`);
  }

  removePrediction(prediction_id) {
    const id = `${prediction_id}`;
    this.bounds = this.bounds.filter(item => item !== id);

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

    this.chart.setOption(this.option, true);
  }

  getMinMaxDates(predictions) {
    const min = new Date(Math.min(...predictions.map(prediction => new Date(prediction.start_date))));
    const max = new Date(Math.max(...predictions.map(prediction => new Date(prediction.end_date))));

    return [min, max]
  }

  clearPredictions() {
    this.option.series = this.option.series.slice(0, 1);
    this.predictions = {};
    this.chart.setOption(this.option);
    this.bounds = [];
  }

  reapplyPredictions() {
    Object.keys(this.predictions).forEach((id) => {
      const prediction = this.predictions[id];
      this._updatePrediction(prediction);
    });
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

  toggleConfidenceBounds(prediction_id) {
    const self = this;
    const id = `${prediction_id}`;
    const pred = this.predictions[id];
    const pIndex = this.option.series.findIndex((series) => series.name === id);

    const hasBounds = this.option.series.some(series =>
      series.name.includes(`${id}-lower`) || series.name.includes(`${id}-upper`)
    );

    if (!hasBounds) {
      function getBoundData(bound) {
        return self.option.xAxis.data.map((label) => {
          const i = pred.chart.labels.indexOf(label);
          return i !== -1 ? pred[bound][i] : NaN;
        })
      }

      function getBound(bound) {
        const name = `${id}-${bound}`;
        const bound_n = bound.split("_")[1];
        const area = {
          name: name,
          type: 'line',
          data: getBoundData(bound),
          lineStyle: {
            color: pred.color,
            opacity: 0
          },
          itemStyle: {
            color: pred.color,
          },
          stack: id + bound_n,
          symbol: 'none',
          showSymbol: false,
        };

        if (bound.includes("upper")) {
          area["areaStyle"] = {
            color: pred.color,
            opacity: 0.3,
          };
        }

        return area;
      }

      this.option.series.splice(
        pIndex + 1,
        0,
        getBound("lower_50"),
        getBound("lower_90"),
        getBound("upper_50"),
        getBound("upper_90"),
      );
      this.bounds.push(id);
    } else {
      this.option.series = this.option.series.filter(series => !series.name.includes(`${id}-lower`) && !series.name.includes(`${id}-upper`));
      this.bounds = this.bounds.filter(item => item !== id);
    }

    this.option.legend.data = this.option.series
      .filter(series => !series.name.includes("lower") && !series.name.includes("upper"))
      .map(series => ({
        name: series.name,
        textStyle: {
          fontWeight: this.bounds.includes(series.name) && !hasBounds ? 'bold' : 'normal'
        }
      }));

    this.chart.setOption(this.option, true);
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
      symbol: 'circle',
      symbolSize: 1,
      itemStyle: {
        color: prediction.color,
      },
    });

    this.option.legend.data = this.option.series
      .filter(series => !series.name.includes("lower") && !series.name.includes("upper"))
      .map(series => ({
        name: series.name,
        textStyle: {
          fontWeight: this.bounds.includes(series.name) ? 'bold' : 'normal'
        }
      }));

    this.chart.setOption(this.option, true);
  }

  _updatePrediction(prediction) {
    const self = this;

    function getData(param) {
      return self.option.xAxis.data.map((label) => {
        const i = prediction.chart.labels.indexOf(label);
        return i !== -1 ? prediction.chart[param][i] : NaN;
      })
    }

    const id = `${prediction.id}`;
    const i = this.option.series.findIndex((series) => series.name === id);
    const u50 = this.option.series.findIndex((series) => series.name === `${id}-upper_50`);
    const u90 = this.option.series.findIndex((series) => series.name === `${id}-upper_90`);
    const l50 = this.option.series.findIndex((series) => series.name === `${id}-lower_50`);
    const l90 = this.option.series.findIndex((series) => series.name === `${id}-lower_90`);

    if (i !== -1) {
      this.option.series[i].data = getData("data");
      this.option.series[i].lineStyle.color = prediction.color;
    }
    if (u50 !== -1) {
      this.option.series[u50].data = getData("upper_50");
      this.option.series[u50].lineStyle.color = prediction.color;
    }
    if (u90 !== -1) {
      this.option.series[u90].data = getData("upper_90");
      this.option.series[u90].lineStyle.color = prediction.color;
    }
    if (l50 !== -1) {
      this.option.series[l50].data = getData("lower_50");
      this.option.series[l50].lineStyle.color = prediction.color;
    }
    if (l90 !== -1) {
      this.option.series[l90].data = getData("lower_90");
      this.option.series[l90].lineStyle.color = prediction.color;
    }

    this.option.legend.data = this.option.series
      .filter(series => !series.name.includes("lower") && !series.name.includes("upper"))
      .map(series => ({
        name: series.name,
        textStyle: {
          fontWeight: this.bounds.includes(series.name) ? 'bold' : 'normal'
        }
      })
      );

    this.chart.setOption(this.option, true);
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
