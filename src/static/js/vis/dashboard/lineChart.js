class LineChart {
  constructor(containerId) {
    this.chart = echarts.init(document.getElementById(containerId));
    this.predictions = {};
    this.option = {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const p = params.filter(param => !isNaN(param.value));
          if (p.length === 0) return '';

          const date = p[0].axisValue;
          const casesInfo = p.map(param => {
            return `${param.marker} ${param.seriesName}: ${param.value} cases`;
          }).join('<br/>');

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
    this.chart.setOption(this.option, true);
  }

  updateCases(dates, cases) {
    this.option.xAxis.data = dates;
    this.option.series[0].data = cases;
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

    if (this.predictions[id]) {
      const i = this.option.series.findIndex((series) => series.name === id);
      if (i !== -1) {
        this.option.series.splice(i, 1);
        delete this.predictions[id];
      }
      const u = this.option.series.findIndex((series) => series.name === `${id}-U`);
      if (u !== -1) {
        this.option.series.splice(u, 1);
      }
      const l = this.option.series.findIndex((series) => series.name === `${id}-L`);
      if (l !== -1) {
        this.option.series.splice(l, 1);
      }
    }

    this.chart.setOption(this.option, true);
  }

  clearPredictions() {
    this.option.series = this.option.series.slice(0, 1);
    this.predictions = {};
    this.chart.setOption(this.option);
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
    const id = `${prediction_id}`;
    const pred = this.predictions[id];
    const pIndex = this.option.series.findIndex((series) => series.name === id);

    const hasBounds = this.option.series.some(series =>
      series.name === `${id}-L` || series.name === `${id}-U`
    );

    if (!hasBounds) {
      const pUpper = this.option.xAxis.data.map((label) => {
        const i = pred.labels.indexOf(label);
        return i !== -1 ? pred.upper[i] : NaN;
      });

      const pLower = this.option.xAxis.data.map((label) => {
        const i = pred.labels.indexOf(label);
        return i !== -1 ? pred.lower[i] : NaN;
      });

      const lBounds = {
        name: `${id}-L`,
        type: 'line',
        data: pLower,
        lineStyle: {
          color: pred.color,
          opacity: 0
        },
        itemStyle: {
          color: pred.color,
        },
        stack: `${id}`,
        symbol: 'none',
        showSymbol: false,
      };

      const uBounds = {
        name: `${id}-U`,
        type: 'line',
        data: pUpper,
        lineStyle: {
          color: pred.color,
          opacity: 0
        },
        itemStyle: {
          color: pred.color,
        },
        areaStyle: {
          color: pred.color,
          opacity: 0.3,
        },
        stack: `${id}`,
        symbol: 'none',
        showSymbol: false,
      };

      this.option.series.splice(pIndex + 1, 0, lBounds, uBounds);
    } else {
      this.option.series = this.option.series.filter(series =>
        series.name !== `${id}-L` && series.name !== `${id}-U`
      );
    }

    this.option.legend.data = this.option.series
      .map(series => series.name)
      .filter(name => !name.includes('-U') && !name.includes('-L'));

    this.chart.setOption(this.option, true);
  }

  _addNewPrediction(prediction) {
    const id = `${prediction.id}`;
    const pdata = this.option.xAxis.data.map((label) => {
      const i = prediction.labels.indexOf(label);
      return i !== -1 ? prediction.data[i] : NaN;
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

    this.option.legend.data = this.option.series.map(series => series.name);
    this.chart.setOption(this.option, true);
  }

  _updatePrediction(prediction) {
    const id = `${prediction.id}`;
    const pdata = this.option.xAxis.data.map((label) => {
      const i = prediction.labels.indexOf(label);
      return i !== -1 ? prediction.data[i] : NaN;
    });
    const pupper = this.option.xAxis.data.map((label) => {
      const i = prediction.labels.indexOf(label);
      return i !== -1 ? prediction.upper[i] : NaN;
    });
    const plower = this.option.xAxis.data.map((label) => {
      const i = prediction.labels.indexOf(label);
      return i !== -1 ? prediction.lower[i] : NaN;
    });

    const i = this.option.series.findIndex((series) => series.name === id);
    const u = this.option.series.findIndex((series) => series.name === `${id}-U`);
    const l = this.option.series.findIndex((series) => series.name === `${id}-L`);

    if (i !== -1) {
      this.option.series[i].data = pdata;
      this.option.series[i].lineStyle.color = prediction.color;
    }
    if (u !== -1) {
      this.option.series[u].data = pupper;
      this.option.series[u].lineStyle.color = prediction.color;
    }
    if (l !== -1) {
      this.option.series[l].data = plower;
      this.option.series[l].lineStyle.color = prediction.color;
    }

    this.option.legend.data = this.option.series.map(series => series.name);
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
            text: 'Select Model and Predictions to be visualized',
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
