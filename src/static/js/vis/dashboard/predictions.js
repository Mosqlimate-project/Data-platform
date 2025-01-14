document.addEventListener('DOMContentLoaded', function() {
  const dashboards = JSON.parse(localStorage.getItem("dashboards"));

  var chartCtx = document.getElementById('chart').getContext('2d');
  new Chart(chartCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          label: "Cases",
          borderColor: 'rgba(17, 34, 80, 1)',
          backgroundColor: 'rgba(17, 34, 80, 0.2)',
          fill: true,
          tension: 0.3,
        },
      ]
    },
    options: {
      plugins: {
        legend: {
          display: true,
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            useBorderRadius: true,
            borderRadius: 5,
          }
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
            display: false
          }
        },
        y: {
          title: {
            display: true,
            text: "New Cases",
          },
          grid: {
            display: false
          },
          beginAtZero: true
        }
      },
    }
  });

  const dateSlider = $(`#date-picker`);
  try {
    dateSlider.dateRangeSlider("destroy");
  } catch (err) {
    // console.log(err)
  }

  dateSlider.dateRangeSlider({
    bounds: {
      min: new Date(min_window_date),
      max: new Date(max_window_date),
    },
    defaultValues: {
      min: new Date(dashboards[dashboard].start_window_date),
      max: new Date(dashboards[dashboard].end_window_date),
    },
    range: {
      min: { days: 90 },
    },
  });

  dateSlider.bind("valuesChanged", function(e, data) {
    const storage = JSON.parse(localStorage.getItem('dashboards'));
    const startDate = data.values.min;
    const endDate = data.values.max;

    storage[dashboard]["start_window_date"] = startDate.toISOString().split('T')[0];
    storage[dashboard]["end_window_date"] = endDate.toISOString().split('T')[0];
    localStorage.setItem('dashboards', JSON.stringify(storage));
    update_casos(dashboard);
  });

  update_casos(dashboard);
});


async function update_casos(dashboard) {
  const chart = Chart.getChart("chart");
  const dashboards = JSON.parse(localStorage.getItem("dashboards"));
  const { disease, adm_level, adm_1, adm_2, start_window_date, end_window_date } = dashboards[dashboard];

  const params = new URLSearchParams();
  params.append("dashboard", dashboard);
  params.append("disease", disease);
  params.append("adm-level", adm_level);
  params.append("adm-1", adm_1);
  params.append("adm-2", adm_2);

  try {
    const res = await new Promise((resolve, reject) => {
      $.ajax({
        type: "GET",
        url: "/vis/get-hist-alerta-data/?",
        data: params.toString(),
        success: function(response) {
          resolve(response);
        },
        error: function(jqXHR, textStatus, errorThrown) {
          reject(errorThrown);
        },
      });
    });

    const startDate = new Date(start_window_date);
    const endDate = new Date(end_window_date);

    const labels = Object.keys(res);
    const data = Object.values(res);

    const filteredLabels = [];
    const filteredData = [];
    labels.forEach((label, index) => {
      const currentDate = new Date(label);
      if (currentDate >= startDate && currentDate <= endDate) {
        filteredLabels.push(label);
        filteredData.push(data[index]);
      }
    });

    chart.data.labels = filteredLabels;
    chart.data.datasets[0].data = filteredData;
    chart.update();
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

async function setDateWindowRange(dashboard) {
  const predictList = document.getElementById(`predict-ids-${dashboard}`);
  const [startDate, endDate] = await extractStartEndWindowDate(dashboard);
  const dateSlider = $(`#windowDatePicker-${dashboard}`);

  try {
    dateSlider.dateRangeSlider("destroy");
  } catch (error) {
    console.log(error);
  }

  dateSlider.dateRangeSlider({
    bounds: {
      min: new Date(startDate),
      max: new Date(endDate),
    },
    defaultValues: {
      min: new Date(startDate),
      max: new Date(endDate),
    },
    range: {
      min: { days: 90 },
    },
  });

  const predictDatesMap = new Map();

  predictList.querySelectorAll('.predict-item').forEach(item => {
    const predictId = item.getAttribute('id');
    const itemStartDate = new Date(item.getAttribute('data-start-window-date'));
    const itemEndDate = new Date(item.getAttribute('data-end-window-date'));
    predictDatesMap.set(predictId, { start: itemStartDate, end: itemEndDate });
  });

  dateSlider.bind("valuesChanging", function(e, data) {
    const rangeMin = data.values.min;
    const rangeMax = data.values.max;

    predictDatesMap.forEach((dates, predictId) => {
      const escapedId = CSS.escape(predictId);
      const item = predictList.querySelector(`#${escapedId}`);

      if (item) {
        if (dates.end >= rangeMin && dates.start <= rangeMax) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      } else {
        console.warn(`Element with ID ${predictId} not found within the predictList.`);
      }
    });
  });

  dateSlider.bind("valuesChanged", function(e, data) {
    const storage = JSON.parse(localStorage.getItem('dashboards'));
    const startDate = data.values.min;
    const endDate = data.values.max;

    storage[dashboard]["start_window_date"] = startDate.toISOString().split('T')[0];
    storage[dashboard]["end_window_date"] = endDate.toISOString().split('T')[0];
    localStorage.setItem('dashboards', JSON.stringify(storage));
    renderPredictsChart(dashboard);
    updateScores(dashboard, storage[dashboard].score);
  });
}
