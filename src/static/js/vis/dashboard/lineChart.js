class LineChart {
  constructor(containerId) {
    this.chart = echarts.init(document.getElementById(containerId));
    this.predictions = {};
    this.option = {
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['Cases'],
        top: '5%',
      },
      grid: {
        top: '10%',
        bottom: '5%',
        left: '0',
        right: '0',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: [],
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: 'Cases',
          type: 'line',
          data: [],
          smooth: false,
          areaStyle: {},
          lineStyle: {
            width: 2,
          },
        },
      ],
    };
    this.chart.setOption(this.option);
  }

  updateCases(dates, cases) {
    this.option.xAxis.data = dates;
    this.option.series[0].data = cases;
    this.chart.setOption(this.option);
  }

  addPrediction(prediction) {
    const id = `${prediction.id}`;

    if (this.predictions[id]) {
      this._updatePrediction(id, prediction);
    } else {
      this._addNewPrediction(id, prediction);
    }
  }

  _addNewPrediction(id, prediction) {
    const pdata = this.option.xAxis.data.map((label) => {
      const i = prediction.labels.indexOf(label);
      return i !== -1 ? prediction.data[i] : NaN;
    });

    this.predictions[id] = prediction;

    this.option.series.push({
      name: id,
      type: 'line',
      data: pdata,
      smooth: false,
      lineStyle: {
        color: prediction.color,
        width: 2,
      },
    });

    this.chart.setOption(this.option);
  }

  _updatePrediction(id, prediction) {
    const pdata = this.option.xAxis.data.map((label) => {
      const i = prediction.labels.indexOf(label);
      return i !== -1 ? prediction.data[i] : NaN;
    });

    const i = this.option.series.findIndex((series) => series.name === id);
    if (i !== -1) {
      this.option.series[i].data = pdata;
      this.option.series[i].lineStyle.color = prediction.color;
    }

    this.chart.setOption(this.option);
  }

  removePrediction(prediction_id) {
    const id = `${prediction_id}`;
    if (this.predictions[id]) {
      const i = this.option.series.findIndex((series) => series.name === id);
      if (i !== -1) {
        this.option.series.splice(i, 1);
        delete this.predictions[id];
        this.chart.setOption(this.option);
      }
    }
  }

  clearPredictions() {
    this.option.series = this.option.series.slice(0, 1);
    this.predictions = {};
    this.chart.setOption(this.option);
  }

  clear() {
    this.clearPredictions();
    this.option.xAxis.data = [];
    this.option.series[0].data = [];
    this.chart.setOption(this.option);
  }

  reapplyPredictions() {
    Object.keys(this.predictions).forEach((prediction_id) => {
      const prediction = this.predictions[prediction_id];
      this._updatePrediction(prediction_id, prediction);
    });
  }

  resize(width, height) {
    this.chart.resize(width, height)
  }
}
