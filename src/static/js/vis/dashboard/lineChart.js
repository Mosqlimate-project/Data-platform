class LineChart {
  constructor(containerId) {
    this.chart = echarts.init(document.getElementById(containerId));
    this.predictions = {};
    this.option = {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const p = params.filter(param => !isNaN(param.value));
          return p.map(param => {
            return `${param.marker} ${param.seriesName}: ${param.value}`;
          }).join('<br/>');
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
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: 'Cases',
          type: 'line',
          data: [],
          smooth: true,
          areaStyle: {},
          lineStyle: {
            width: 2,
          },
        },
      ],
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

    this.chart.on('mouseover', (params) => {
      if (params.seriesName === id) {
        const prediction = this.predictions[params.seriesName];
        console.log("over");
      }
    });

    this.chart.on('mouseout', (params) => {
      if (params.seriesName === id) {
        const prediction = this.predictions[params.seriesName];
        console.log("out");
      }
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
}
