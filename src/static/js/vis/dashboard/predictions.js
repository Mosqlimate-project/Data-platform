let all_models = [];
let all_models_map = {};

document.addEventListener('DOMContentLoaded', function() {
  initialize_localStorage();
  const dashboards = JSON.parse(localStorage.getItem("dashboards"));

  const grouped_tags = Object.entries(all_tags).reduce((groups, [id, tag]) => {
    const key = tag.group || '';
    if (!groups[key]) groups[key] = [];
    groups[key].push({ id, ...tag });
    return groups;
  }, {});

  console.log(grouped_tags);
  $.each(grouped_tags, function(group, tags) {
    const group_div = $('<div></div>')
      .addClass('tag-group')
      .append(`<h4>${group}</h4>`);

    $.each(tags, function(index, tag) {
      const tag_btn = $('<button></button>')
        .addClass('tag-btn')
        .text(tag.name)
        .css('background-color', tag.color)
        .attr('id', `tag-${tag.id}`);

      group_div.append(tag_btn);
    });

    $('#tags-card .card-body').append(group_div);
  });

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
  get_models_data(dashboard);
});

function initialize_localStorage() {
  let data = localStorage.getItem("dashboards");

  if (!data) { data = {} } else { data = JSON.parse(data) };

  if (!data[dashboard]) {
    data[dashboard] = {
      prediction_ids: null,
      model_ids: null,
      tags: null,
    }
  }

  data[dashboard].prediction_ids = data[dashboard].prediction_ids || [];
  if (model_id) {
    data[dashboard].model_ids = [model_id];
  } else {
    data[dashboard].model_ids = data[dashboard].model_ids || [];
  }
  data[dashboard].tags_ids = data[dashboard].tags_ids || [];

  console.log(data[dashboard].model_ids);
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


async function get_models_data(dashboard) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.innerHTML = `<i class="fas fa-2x fa-sync-alt fa-spin"></i>`;
  $(overlay).appendTo("#models-card");

  const response = await fetch(`/vis/get-models/?dashboard=${dashboard}`);
  if (response.ok) {
    const models = await response.json();
    all_models = models['items'];
    all_models_map = models['items'].reduce((acc, model) => {
      const { description, ..._ } = model;
      acc[model.id] = _;
      return acc;
    }, {});
    models_list(all_models);
    $(`#models-card .overlay`).remove();
  }
}

function model_select(model_id, action) {
  const dashboards = JSON.parse(localStorage.getItem("dashboards"));
  let models = new Set(dashboards[dashboard].model_ids);
  if (action === "add") {
    models.add(model_id);
  } else if (action === "remove") {
    models.delete(model_id);
  }
  dashboards[dashboard].model_ids = Array.from(models);
  localStorage.setItem("dashboards", JSON.stringify(dashboards));
}

function model_item(data) {
  return `
    <tr data-widget="expandable-table" aria-expanded="false">
      <td style="width: 40px;">
        <input type="checkbox" value="${data.id}" id="checkbox-${data.id}" class="checkbox-model">
      </td>
      <td><a href="/registry/model/${data.id}/">${data.id}</a></td>
    </tr>
    <tr class="expandable-body d-none"><td colspan="2"><p>${data.description}</p></td></tr>
  `;
}

function models_list(items) {
  const dashboards = JSON.parse(localStorage.getItem("dashboards"));

  items.sort((a, b) => {
    const aChecked = dashboards[dashboard].model_ids.includes(a.id);
    const bChecked = dashboards[dashboard].model_ids.includes(b.id);
    if (aChecked && !bChecked) return -1;
    if (!aChecked && bChecked) return 1;
    return 0;
  });

  $('#models-pagination').pagination({
    dataSource: items,
    pageSize: 5,
    callback: function(data, pagination) {
      const body = data.map((item) => model_item(item)).join("");
      $(`#models-list`).html(`
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th>ID</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      `);

      $(".checkbox-model").each(function() {
        const dashboards = JSON.parse(localStorage.getItem("dashboards"));
        const model_id = parseInt($(this).val(), 10);
        if (dashboards[dashboard].model_ids.includes(model_id)) {
          $(this).prop("checked", true);
          model_select(model_id, "add");
        } else {
          $(this).prop("checked", false);
          model_select(model_id, "remove");
        }
      });

      $(".checkbox-model").on("click", function(event) {
        event.stopPropagation();
        const model_id = parseInt(event.target.value, 10);
        if ($(event.target).prop("checked")) {
          model_select(model_id, "add");
        } else {
          model_select(model_id, "remove");
        }
      });
    },
  });

  $("input[name='models-search']").off("input").on("input", function() {
    models_search(this.value, items);
  });
}

function models_search(query) {
  const items = all_models.filter((model) =>
    model.id.toString().toLowerCase().includes(query.toLowerCase()) ||
    model.disease.toLowerCase().includes(query.toLowerCase()) ||
    model.time_resolution.toLowerCase().includes(query.toLowerCase()) ||
    model.author.toLowerCase().includes(query.toLowerCase())
  );
  models_list(items);
}


function prediction_item(data) {
  return `
    <tr data-widget="expandable-table" aria-expanded="false">
      <td style="width: 40px;">
        <input type="checkbox" value="${data.id}" id="checkbox-${data.id}">
      </td>
      <td>${data.id}</td>
    </tr>
    <tr class="expandable-body d-none"><td colspan="2"><p>${data.id}</p></td></tr>
  `;
}

function predictions_list(items) {
  const body = items['items'].map((item) => prediction_item(item)).join("");
  $(`#predictions-list`).html(`
    <thead>
      <tr>
        <th style="width: 40px;">
          <input type="checkbox" id="predictions-check-all">
        </th>
        <th>ID</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  `);
}
