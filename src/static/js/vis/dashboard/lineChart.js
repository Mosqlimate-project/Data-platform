class LineChart {
  constructor(canvasId) {
    const chartCtx = document.getElementById(canvasId).getContext('2d');

    this.chart = new Chart(chartCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Cases',
            data: [],
            borderColor: 'rgba(17, 34, 80, 1)',
            backgroundColor: 'rgba(17, 34, 80, 0.2)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        elements: {
          line: {
            spanGaps: true,
          },
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              usePointStyle: true,
              pointStyle: 'line',
              useBorderRadius: true,
              borderRadius: 5,
            },
          },
        },
        responsive: true,
        scales: {
          x: {
            title: {
              display: true,
            },
            ticks: {
              autoSkip: true,
              maxTicksLimit: 10,
            },
            grid: {
              display: false,
            },
          },
          y: {
            title: {
              display: true,
              text: 'New Cases',
            },
            grid: {
              display: false,
            },
            beginAtZero: true,
          },
        },
      },
    });

    this.predictions = {};
  }

  updateLabels(labels) {
    this.chart.data.labels = labels;
    this.chart.update();
  }

  updateDataset(data) {
    this.chart.data.datasets[0].data = data;
    this.chart.update();
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
    const pdata = this.chart.data.labels.map(label => {
      const index = prediction.labels.indexOf(label);
      return index !== -1 ? prediction.data[index] : NaN;
    });

    this.predictions[id] = prediction;

    this.chart.data.datasets.push({
      label: id,
      data: pdata,
      borderColor: prediction.color,
      fill: false,
      tension: 0.3,
    });

    this.chart.update();
  }

  _updatePrediction(id, prediction) {
    const pdata = this.chart.data.labels.map(label => {
      const index = prediction.labels.indexOf(label);
      return index !== -1 ? prediction.data[index] : NaN;
    });

    const datasetIndex = this.chart.data.datasets.findIndex(dataset => dataset.label === id);
    if (datasetIndex !== -1) {
      this.chart.data.datasets[datasetIndex].data = pdata;
      this.chart.data.datasets[datasetIndex].borderColor = prediction.color;
    }

    this.chart.update();
  }

  removePrediction(prediction_id) {
    const id = `${prediction_id}`;
    if (this.predictions[id]) {
      const index = this.chart.data.datasets.findIndex(
        (dataset) => dataset.label === id
      );
      if (index !== -1) {
        this.chart.data.datasets.splice(index, 1);
        delete this.predictions[id];
        this.chart.update();
      }
    }
  }

  clearPredictions() {
    this.chart.data.datasets = this.chart.data.datasets.slice(0, 1);
    this.predictions = {};
    this.chart.update();
  }

  clearChart() {
    this.clearPredictions();
    this.chart.data.labels = [];
    this.chart.data.datasets[0].data = [];
    this.chart.update();
  }

  reapplyPredictions() {
    Object.keys(this.predictions).forEach(prediction_id => {
      const prediction = this.predictions[prediction_id];
      this._updatePrediction(prediction_id, prediction);
    });
  }
}
