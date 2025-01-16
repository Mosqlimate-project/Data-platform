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

  // dateSlider.dateRangeSlider({
  //   bounds: {
  //     min: new Date(min_window_date),
  //     max: new Date(max_window_date),
  //   },
  //   defaultValues: {
  //     min: new Date(dashboards[dashboard].start_window_date),
  //     max: new Date(dashboards[dashboard].end_window_date),
  //   },
  //   range: {
  //     min: { days: 90 },
  //   },
  // });
  //
  // $('[data-widget="pushmenu"]').on('click', function() {
  //   setTimeout(() => {
  //     dateSlider.dateRangeSlider("resize");
  //   }, 350)
  // });
  //
  // dateSlider.bind("valuesChanged", function(e, data) {
  //   const storage = JSON.parse(localStorage.getItem('dashboards'));
  //   const startDate = data.values.min;
  //   const endDate = data.values.max;
  //
  //   storage[dashboard]["start_window_date"] = startDate.toISOString().split('T')[0];
  //   storage[dashboard]["end_window_date"] = endDate.toISOString().split('T')[0];
  //   localStorage.setItem('dashboards', JSON.stringify(storage));
  //   update_casos(dashboard);
  // });

  // update_casos(dashboard);
  render_model_page(dashboard, 1, []);
  render_prediction_page(dashboard, 1, []);
});


function initialize_localStorage() {
  let data = localStorage.getItem("dashboards");

  if (!data) { data = {} } else { data = JSON.parse(data) };

  if (!data[dashboard]) {
    data[dashboard] = {
      disease: null,
      time_resolution: null,
      adm_level: null,
      adm_1: null,
      adm_2: null,
      start_window_date: null,
      end_window_date: null,
      prediction_ids: null,
      model_ids: null,
      tags: null,
    }
  }

  data[dashboard].disease = data[dashboard].disease || disease;
  data[dashboard].time_resolution = data[dashboard].time_resolution || time_resolution;
  data[dashboard].adm_level = data[dashboard].adm_level || adm_level;
  data[dashboard].adm_1 = data[dashboard].adm_1 || adm_1;
  data[dashboard].adm_2 = data[dashboard].adm_2 || adm_2;
  data[dashboard].start_window_date = data[dashboard].start_window_date || min_window_date;
  data[dashboard].end_window_date = data[dashboard].end_window_date || max_window_date;
  data[dashboard].prediction_ids = data[dashboard].prediction_ids || [];
  data[dashboard].model_ids = data[dashboard].model_ids || [];
  data[dashboard].tags_ids = data[dashboard].tags_ids || [];

  localStorage.setItem("dashboards", JSON.stringify(data));
}


async function update_casos(dashboard) {
  const chart = Chart.getChart("chart");
  const dashboards = JSON.parse(localStorage.getItem("dashboards"));
  const { disease, adm_level, adm_1, adm_2, start_window_date, end_window_date } = dashboards[dashboard];

  const params = new URLSearchParams();
  params.append("dashboard", dashboard);
  // params.append("disease", disease);
  // params.append("adm-level", adm_level);
  // params.append("adm-1", adm_1);
  // params.append("adm-2", adm_2);
  params.append("disease", "dengue");
  params.append("adm-level", 1);
  params.append("adm-1", "SP");
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
    console.error(error);
  }
}


async function get_models(dashboard, page, tags) {
  const params = new URLSearchParams({
    dashboard: dashboard,
    page: page,
  });

  tags.forEach(tag => params.append("tags", tag));

  try {
    const response = await fetch(`/vis/get-models/?${params.toString()}`);
    if (!response.ok) {
      throw new Error(response.status);
    }

    const context = await response.json();
    return context;
  } catch (error) {
    console.error(error);
    throw error;
  }
}


async function get_predictions(dashboard, page, tags) {
  const params = new URLSearchParams({
    dashboard: dashboard,
    page: page,
  });

  tags.forEach(tag => params.append("tags", tag));

  try {
    const response = await fetch(`/vis/get-predictions/?${params.toString()}`);
    if (!response.ok) {
      throw new Error(response.status);
    }

    const context = await response.json();
    console.log(context);
    return context;
  } catch (error) {
    console.error(error);
    throw error;
  }
}


async function render_model_page(dashboard, page, tags) {
  try {
    const currentContext = await get_models(dashboard, page, tags);

    // const previousContext = currentContext.pagination.has_previous
    //   ? await get_models(dashboard, page - 1, tags)
    //   : null;
    //
    // const nextContext = currentContext.pagination.has_next
    //   ? await get_models(dashboard, page + 1, tags)
    //   : null;

    const tableBody = currentContext.items
      .map(
        (model) =>
          `<tr>
            <td>${model.id}</td>
          </tr>`
      )
      .join("");

    $("#model-list")
      .html(`<thead>
               <tr>
                 <th>ID</th>
               </tr>
             </thead>
             <tbody>
               ${tableBody}
             </tbody>`);

    const pagination = [];
    if (currentContext.pagination.has_previous) {
      pagination.push(
        `<li class="page-item">
           <a class="page-link" href="#" data-page="${page - 1}">Previous</a>
         </li>`
      );
    }

    pagination.push(
      `<li class="page-item active">
         <span class="page-link">${currentContext.pagination.current_page}</span>
       </li>`
    );

    if (currentContext.pagination.has_next) {
      pagination.push(
        `<li class="page-item">
           <a class="page-link" href="#" data-page="${page + 1}">Next</a>
         </li>`
      );
    }

    $("#model-pagination").html(pagination.join(""));

    $("#model-pagination .page-link").on("click", function(e) {
      e.preventDefault();
      const newPage = $(this).data("page");
      render_model_page(dashboard, newPage, tags);
    });
  } catch (error) {
    console.error("Error rendering model page:", error);
  }
}


async function render_prediction_page(dashboard, page, tags) {
  try {
    const currentContext = await get_predictions(dashboard, page, tags);

    // const previousContext = currentContext.pagination.has_previous
    //   ? await get_models(dashboard, page - 1, tags)
    //   : null;
    //
    // const nextContext = currentContext.pagination.has_next
    //   ? await get_models(dashboard, page + 1, tags)
    //   : null;

    const tableBody = currentContext.items
      .map(
        (prediction) =>
          `<tr>
            <td>${prediction.id}</td>
          </tr>`
      )
      .join("");

    $("#prediction-list")
      .html(`<thead>
               <tr>
                 <th>ID</th>
               </tr>
             </thead>
             <tbody>
               ${tableBody}
             </tbody>`);

    const pagination = [];
    if (currentContext.pagination.has_previous) {
      pagination.push(
        `<li class="page-item">
           <a class="page-link" href="#" data-page="${page - 1}">Previous</a>
         </li>`
      );
    }

    pagination.push(
      `<li class="page-item active">
         <span class="page-link">${currentContext.pagination.current_page}</span>
       </li>`
    );

    if (currentContext.pagination.has_next) {
      pagination.push(
        `<li class="page-item">
           <a class="page-link" href="#" data-page="${page + 1}">Next</a>
         </li>`
      );
    }

    $("#prediction-pagination").html(pagination.join(""));

    $("#prediction-pagination .page-link").on("click", function(e) {
      e.preventDefault();
      const newPage = $(this).data("page");
      render_prediction_page(dashboard, newPage, tags);
    });
  } catch (error) {
    console.error(error);
  }
}
