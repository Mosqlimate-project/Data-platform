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
        top: 0,
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
          name: 'New Cases',
          type: 'value',
          nameLocation: 'end',
          nameGap: 10,
          nameTextStyle: {
            padding: [0, 0, 5, -12],
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
    console.log(prediction_id)
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
  }

  resize(width, height) {
    this.chart.resize(width, height)
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
      symbolSize: 0,
      itemStyle: {
        color: prediction.color,
      },
      emphasis: {
        focus: 'series',
      },
    });

    this.chart.setOption(this.option, true);
  }

  _updatePrediction(prediction) {
    const id = `${prediction.id}`;
    const pdata = this.option.xAxis.data.map((label) => {
      const i = prediction.labels.indexOf(label);
      return i !== -1 ? prediction.data[i] : NaN;
    });

    const i = this.option.series.findIndex((series) => series.name === id);
    if (i !== -1) {
      this.option.series[i].data = pdata;
      this.option.series[i].lineStyle.color = prediction.color;
    }

    this.chart.setOption(this.option, true);
  }
}
