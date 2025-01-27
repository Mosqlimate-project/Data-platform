let all_models = [];
let all_models_map = {};
let current_models = [];

let predictions_map = {};

const unique_tag_groups = ["disease", "adm_level", "time_resolution"];
let chart;

function hexToRgba(hex, alpha = 1) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

document.addEventListener('DOMContentLoaded', function() {
  $('#tags-card .card-tools button').click()
  initialize_localStorage();
  initialize_tags();

  const dashboards = JSON.parse(localStorage.getItem("dashboards"));
  const dateSlider = $(`#date-picker`);
  chart = new LineChart('chart');

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

  $('[data-widget="pushmenu"]').on('click', function() {
    setTimeout(() => {
      dateSlider.dateRangeSlider("resize");
    }, 350)
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

  // update_casos(dashboard);
  get_models_data(dashboard);
  get_predictions_data(dashboard);
});

function initialize_localStorage() {
  let data = localStorage.getItem("dashboards");
  if (!data) { data = {} } else { data = JSON.parse(data) };
  if (!data[dashboard]) {
    data[dashboard] = {
      prediction_ids: null,
      model_ids: null,
      tag_ids: null,
      start_window_date: null,
      end_window_date: null,
      adm_1: null,
      adm_2: null,
    }
  }
  data[dashboard].prediction_ids = data[dashboard].prediction_ids || [];
  if (model_id) {
    data[dashboard].model_ids = [model_id];
  } else {
    data[dashboard].model_ids = data[dashboard].model_ids || [];
  }
  data[dashboard].tag_ids = data[dashboard].tag_ids || [];
  if (!data[dashboard].start_window_date) {
    data[dashboard].start_window_date = min_window_date;
  }
  if (!data[dashboard].end_window_date) {
    data[dashboard].end_window_date = max_window_date;
  }
  data[dashboard].adm_1 = data[dashboard].adm_1 || null;
  data[dashboard].adm_2 = data[dashboard].adm_2 || null;
  localStorage.setItem("dashboards", JSON.stringify(data));
}

function initialize_tags() {
  const dashboards = JSON.parse(localStorage.getItem("dashboards"));

  const grouped_tags = Object.entries(all_tags).reduce((groups, [id, tag]) => {
    const key = tag.group || 'Others';
    if (!groups[key]) groups[key] = [];
    groups[key].push({ id, ...tag });
    groups[key].sort((a, b) => a.name.localeCompare(b.name));
    return groups;
  }, {});

  $.each(grouped_tags, function(group, tags) {
    const group_div = $('<div></div>')
      .attr('id', `tag-group-${group}`)
      .addClass('tag-group')
      .append(`<div class="tag-group-title"><small>${group}</small></div>`);

    $.each(tags, function(index, tag) {
      const tag_btn = $('<button></button>')
        .addClass('tag-btn')
        .css('background-color', tag.color)
        .attr('id', `tag-${tag.id}`)
        .attr('value', tag.id)
        .append($('<p></p>').text(tag.name))
        .on('click', function() {
          $(this).toggleClass('active');
          const id = parseInt(this.value);
          if ($(this).hasClass('active')) {
            tag_select(id);
          } else {
            tag_unselect(id);
          }
        });

      if (dashboards[dashboard].tag_ids.includes(parseInt(tag.id))) {
        tag_btn.addClass('active');
      }

      group_div.append(tag_btn);
    });

    if (unique_tag_groups.includes(group)) {
      if (group_div.find('button.active').length > 0) {
        group_div.find('button').each(function() {
          if (!$(this).hasClass('active')) {
            $(this).prop('disabled', true);
          }
        });
      }
    }

    $('#tags-card .card-body').append(group_div);
  });
}

async function update_casos(dashboard) {
  const dashboards = JSON.parse(localStorage.getItem('dashboards'));
  const tag_ids = dashboards[dashboard].tag_ids;
  const start_window_date = dashboards[dashboard].start_window_date;
  const end_window_date = dashboards[dashboard].end_window_date;

  function parse_tag_name(param, name) {
    if (['disease', 'time_resolution'].includes(param)) {
      name = name.toLowerCase();
    }
    if (param == 'adm_level') {
      name = parseInt(name.split('ADM ')[1]);
    }
    return name;
  }

  const params = {};
  tag_ids.forEach((tag_id) => {
    const tag = all_tags[tag_id];
    if (tag && tag.group) {
      params[tag.group] = parse_tag_name(tag.group, tag.name);
    }
  });

  let disease = params['disease'] || null;
  let time_resolution = params['time_resolution'] || null;
  let adm_level = params['adm_level'] || null;
  let adm_1 = dashboards[dashboard].adm_1;
  let adm_2 = dashboards[dashboard].adm_2;

  if (
    !disease ||
    !time_resolution ||
    !adm_level ||
    (adm_level == 1 && !adm_1) ||
    (adm_level == 2 && !adm_2)
  ) {
    chart.clear();
    return;
  }

  const url_params = new URLSearchParams();
  url_params.append('dashboard', dashboard);
  url_params.append('disease', disease);
  url_params.append('adm-level', adm_level);
  url_params.append('adm-1', adm_1);
  url_params.append('adm-2', adm_2);

  try {
    const res = await new Promise((resolve, reject) => {
      $.ajax({
        type: 'GET',
        url: '/vis/get-hist-alerta-data/?',
        data: url_params.toString(),
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

    const dateKeys = Object.keys(res).map(date => new Date(date));
    const minDate = new Date(Math.min(...dateKeys));
    const maxDate = new Date(Math.max(...dateKeys));

    for (let d = new Date(minDate); d < startDate; d.setDate(d.getDate() + 7)) {
      res[d.toISOString().split('T')[0]] = NaN;
    }

    for (let d = new Date(maxDate); d < endDate; d.setDate(d.getDate() + 7)) {
      res[d.toISOString().split('T')[0]] = NaN;
    }

    Object.keys(res).forEach(date => {
      const currentDate = new Date(date);
      if (currentDate > endDate) {
        delete res[date];
      }
      if (currentDate < startDate) {
        delete res[date];
      }
    });

    chart.updateCases(Object.keys(res), Object.values(res));
    chart.reapplyPredictions();
  } catch (error) {
    console.error(error);
  }
}

async function get_models_data(dashboard) {
  const dashboards = JSON.parse(localStorage.getItem("dashboards"));
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
    const filter = model_filter_by_tags(all_models, dashboards[dashboard].tag_ids);
    current_models = filter;
    models_list(current_models);
    $(`#models-card .overlay`).remove();
  }
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

function models_list(models) {
  const dashboards = JSON.parse(localStorage.getItem("dashboards"));

  models.sort((a, b) => {
    const aChecked = dashboards[dashboard].model_ids.includes(a.id);
    const bChecked = dashboards[dashboard].model_ids.includes(b.id);
    if (aChecked && !bChecked) return -1;
    if (!aChecked && bChecked) return 1;
    return 0;
  });

  $('#models-pagination').pagination({
    dataSource: models,
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
        const model_id = parseInt($(this).val(), 10);
        if (dashboards[dashboard].model_ids.includes(model_id)) {
          $(`.checkbox-model[value="${model_id}"]`).prop("checked", true);
        }
      });

      $(".checkbox-model").on("click", function(event) {
        event.stopPropagation();
        const model_id = parseInt(event.target.value, 10);
        if ($(event.target).prop("checked")) {
          model_select(model_id);
        } else {
          model_unselect(model_id, true);
        }
      });
    },
  });

  $("input[name='models-search']").off("input").on("input", function() {
    models_search(this.value, models);
  });
}

function models_search(query) {
  const items = current_models.filter((model) =>
    model.id.toString().toLowerCase().includes(query.toLowerCase()) ||
    model.disease.toLowerCase().includes(query.toLowerCase()) ||
    model.time_resolution.toLowerCase().includes(query.toLowerCase()) ||
    model.author.toLowerCase().includes(query.toLowerCase())
  );
  models_list(items);
}

function model_filter_by_tags(models, tag_ids) {
  const tags = Object.fromEntries(
    Object.entries(all_tags).filter(([key, value]) => tag_ids.includes(parseInt(key)))
  );

  const groups = Object.values(tags).map(tag => tag.group);
  const unique_groups = groups.filter(group => unique_tag_groups.includes(group));

  let filter;

  if (Object.keys(tags).length > 0) {
    if (unique_groups.length > 0) {
      filter = models.filter(model => {
        return model.tags && tag_ids.every(tag_id => model.tags.includes(tag_id));
      });
    } else {
      filter = models.filter(model => {
        return model.tags && model.tags.some(tag_id => tag_ids.includes(tag_id));
      });
    }
    return filter;
  } else {
    return models;
  }
}

function model_select(model_id) {
  const dashboards = JSON.parse(localStorage.getItem("dashboards"));
  let model_ids = new Set(dashboards[dashboard].model_ids);
  let tag_ids = new Set(dashboards[dashboard].tag_ids);

  $(`.checkbox-model[value="${model_id}"]`).prop("checked", true);
  $("input[name='models-search']").val("");

  model_ids.add(model_id);
  all_models_map[model_id].tags.forEach(tag_id => {
    if (all_tags[tag_id]) {
      tag_ids.add(tag_id)
    }
  });

  dashboards[dashboard].model_ids = Array.from(model_ids);
  dashboards[dashboard].tag_ids = Array.from(tag_ids);
  localStorage.setItem("dashboards", JSON.stringify(dashboards));

  tag_ids.forEach(id => tag_select(id));

  const models = model_filter_by_tags(current_models, dashboards[dashboard].tag_ids);
  current_models = models;
  models_list(current_models);
  get_predictions_data(dashboard);
}

function model_unselect(model_id, checkbox = false) {
  const dashboards = JSON.parse(localStorage.getItem("dashboards"));
  let model_ids = new Set(dashboards[dashboard].model_ids);
  let tag_ids = new Set(dashboards[dashboard].tag_ids);

  $(`.checkbox-model[value="${model_id}"]`).prop("checked", false);
  $("input[name='models-search']").val("");

  if (!all_models_map[model_id] || !model_ids.has(model_id)) {
    return;
  }

  model_ids.delete(model_id);

  if (checkbox) {
    const model_tags = all_models_map[model_id].tags;
    model_tags.forEach(tag_id => {
      if (
        tag_ids.has(tag_id) &&
        !Array.from(model_ids).some(other_model_id =>
          all_models_map[other_model_id].tags.includes(tag_id)
        )
      ) {
        tag_ids.delete(tag_id);
        tag_unselect(tag_id);
        dashboards[dashboard].tag_ids = Array.from(tag_ids);
        localStorage.setItem("dashboards", JSON.stringify(dashboards));
      }
    });
  }

  dashboards[dashboard].model_ids = Array.from(model_ids);
  dashboards[dashboard].tag_ids = Array.from(tag_ids);
  localStorage.setItem("dashboards", JSON.stringify(dashboards));

  let models;
  if (dashboards[dashboard].model_ids.length > 0) {
    models = model_filter_by_tags(current_models, dashboards[dashboard].tag_ids);
  } else {
    models = model_filter_by_tags(all_models, dashboards[dashboard].tag_ids);
  }
  current_models = models;
  models_list(current_models);
  get_predictions_data(dashboard);
}

function tag_select(tag_id) {
  if (!all_tags[tag_id]) return;

  const dashboards = JSON.parse(localStorage.getItem("dashboards"));
  const group = all_tags[tag_id].group;
  let tag_ids = new Set(dashboards[dashboard].tag_ids);
  let model_ids = new Set(dashboards[dashboard].model_ids);

  tag_ids.add(tag_id);

  model_ids.forEach(model_id => {
    const model = all_models_map[model_id];
    if (!model.tags.includes(tag_id)) {
      console.log(model_id);
      model_unselect(model_id);
      model_ids.delete(model_id);
    }
  });

  if (!$(`#tag-${tag_id}`).hasClass('active')) {
    $(`#tag-${tag_id}`).addClass('active');
  }

  if (unique_tag_groups.includes(group)) {
    $(`#tag-group-${group}`).find('button').each(function() {
      if (!$(this).hasClass('active')) {
        $(this).prop('disabled', true);
      }
    });
  }

  dashboards[dashboard].tag_ids = Array.from(tag_ids);
  dashboards[dashboard].model_ids = Array.from(model_ids);
  localStorage.setItem("dashboards", JSON.stringify(dashboards));

  let models;
  if (dashboards[dashboard].model_ids.length > 0) {
    models = model_filter_by_tags(current_models, dashboards[dashboard].tag_ids);
  } else {
    models = model_filter_by_tags(all_models, dashboards[dashboard].tag_ids);
  }
  current_models = models;
  models_list(current_models);
}

function tag_unselect(tag_id) {
  if (!all_tags[tag_id]) return;
  const dashboards = JSON.parse(localStorage.getItem("dashboards"));
  const group = all_tags[tag_id].group;
  let model_ids = new Set(dashboards[dashboard].model_ids);
  let tag_ids = new Set(dashboards[dashboard].tag_ids);

  model_ids.forEach(model_id => {
    const model = all_models_map[model_id];
    if (model.tags.includes(tag_id)) {
      model_unselect(model_id);
    }
  });

  tag_ids.delete(tag_id);
  $(`#tag-${tag_id}`).removeClass('active');

  if (unique_tag_groups.includes(group)) {
    $(`#tag-group-${group}`).find('button').prop('disabled', false);
  }

  dashboards[dashboard].tag_ids = Array.from(tag_ids);
  localStorage.setItem("dashboards", JSON.stringify(dashboards));

  let models;
  if (dashboards[dashboard].model_ids.length > 0) {
    models = model_filter_by_tags(current_models, dashboards[dashboard].tag_ids);
  } else {
    models = model_filter_by_tags(all_models, dashboards[dashboard].tag_ids);
  }
  if (dashboards[dashboard].model_ids.length === 0 && tag_ids.size === 0) {
    models = model_filter_by_tags(all_models, dashboards[dashboard].tag_ids);
  }
  current_models = models;
  models_list(current_models);
}



//

async function get_predictions_data(dashboard) {
  const dashboards = JSON.parse(localStorage.getItem("dashboards"));
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.innerHTML = `<i class="fas fa-2x fa-sync-alt fa-spin"></i>`;
  $(overlay).appendTo("#predictions-card");

  const url = new URL('/vis/get-predictions/', window.location.origin);
  dashboards[dashboard].model_ids.forEach(id => url.searchParams.append('model_id', id))

  if (dashboards[dashboard].model_ids.length === 0) {
    predictions_list([]);
    $(`#predictions-card .overlay`).remove();
    return;
  }

  const response = await fetch(url);
  if (response.ok) {
    const res = await response.json();
    predictions_list(res['items']);
    $(`#predictions-card .overlay`).remove();
  }
}

function prediction_item(data) {
  return `
    <tr>
      <td style="width: 40px;">
        <input type="checkbox" value="${data.id}" id="checkbox-${data.id}" class="checkbox-prediction">
      </td>
      <td>${data.id}</td>
    </tr>
  `;
}

function predictions_list(predictions) {
  const dashboards = JSON.parse(localStorage.getItem("dashboards"));

  predictions.sort((a, b) => {
    const aChecked = dashboards[dashboard].prediction_ids.includes(a.id);
    const bChecked = dashboards[dashboard].prediction_ids.includes(b.id);
    if (aChecked && !bChecked) return -1;
    if (!aChecked && bChecked) return 1;
    return 0;
  });

  console.log(predictions);

  const distinctAdm = [
    ...new Set(
      predictions.map(prediction => prediction.adm_1 || prediction.adm_2)
    ),
  ].filter(Boolean);

  const firstAdm = distinctAdm[0];
  const adm2 = predictions.some(prediction => prediction.adm_2 !== null);

  if (!adm2) {
    dashboards[dashboard].adm_1 = firstAdm;
  } else {
    dashboards[dashboard].adm_2 = firstAdm;
  }
  localStorage.setItem("dashboards", JSON.stringify(dashboards));

  const dropdownHtml = `
    <select id="adm-filter" class="form-control" style="width: 100px; margin-left: 10px;">
      ${distinctAdm.map(adm => `
        <option value="${adm}" ${adm === firstAdm ? 'selected' : ''}>${adm}</option>
      `).join("")}
    </select>
  `;

  $("#predictions-card .card-header .card-tools").html(dropdownHtml);

  const filterPredictions = (selectedAdm) => {
    const dashboards = JSON.parse(localStorage.getItem("dashboards"));
    if (!adm2) {
      dashboards[dashboard].adm_1 = selectedAdm;
    } else {
      dashboards[dashboard].adm_2 = selectedAdm;
    }
    localStorage.setItem("dashboards", JSON.stringify(dashboards));
    update_casos(dashboard);

    filter = selectedAdm
      ? predictions.filter(
        prediction => prediction.adm_1 == selectedAdm || prediction.adm_2 == selectedAdm
      )
      : predictions;

    predictions_map = filter.reduce((acc, prediction) => {
      const { description, ..._ } = prediction;
      acc[prediction.id] = _;
      return acc;
    }, {});

    return filter;
  };

  $('#predictions-pagination').pagination({
    dataSource: filterPredictions(firstAdm),
    pageSize: 5,
    callback: function(data, pagination) {
      const body = data.map((item) => prediction_item(item)).join("");
      $(`#predictions-list`).html(`
        <thead>
          <tr>
            <th style="width: 40px;">
              <input type="checkbox" id="select-all-checkbox">
            </th>
            <th>ID</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      `);

      $(".checkbox-prediction").each(function() {
        const prediction_id = parseInt($(this).val(), 10);
        if (dashboards[dashboard].prediction_ids.includes(prediction_id)) {
          $(`.checkbox-prediction[value="${prediction_id}"]`).prop("checked", true);
        }
      });

      $("#select-all-checkbox").on("click", function() {
        const isChecked = $(this).prop("checked");
        $(".checkbox-prediction").prop("checked", isChecked).each(function() {
          const prediction_id = parseInt($(this).val(), 10);
          const prediction = predictions_map[prediction_id];
          if (isChecked) {
            chart.addPrediction({
              id: prediction_id,
              labels: prediction.chart.labels,
              data: prediction.chart.data,
              color: prediction.color
            })
          } else {
            chart.removePrediction(prediction_id)
          }
        });
      });

      $(".checkbox-prediction").on("click", function(event) {
        event.stopPropagation();
        const prediction_id = parseInt(event.target.value, 10);

        if ($(event.target).prop("checked")) {
          const prediction = predictions_map[prediction_id];
          chart.addPrediction({
            id: prediction_id,
            labels: prediction.chart.labels,
            data: prediction.chart.data,
            color: prediction.color
          })
        } else {
          chart.removePrediction(prediction_id)
        }
      });
    },
  });

  $("#adm-filter").on("change", function() {
    const selectedAdm = $(this).val();
    const filteredPredictions = filterPredictions(selectedAdm);
    chart.clearPredictions();

    $('#predictions-pagination').pagination({
      dataSource: filteredPredictions,
      pageSize: 5,
      callback: function(data, pagination) {
        const body = data.map((item) => prediction_item(item)).join("");
        $(`#predictions-list`).html(`
          <thead>
            <tr>
              <th style="width: 40px;">
                <input type="checkbox" id="select-all-checkbox">
              </th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        `);

        $(".checkbox-prediction").each(function() {
          const prediction_id = parseInt($(this).val(), 10);
          if (dashboards[dashboard].prediction_ids.includes(prediction_id)) {
            $(`.checkbox-prediction[value="${prediction_id}"]`).prop("checked", true);
          }
        });

        $("#select-all-checkbox").on("click", function() {
          const isChecked = $(this).prop("checked");
          $(".checkbox-prediction").prop("checked", isChecked).each(function() {
            const prediction_id = parseInt($(this).val(), 10);
            const prediction = predictions_map[prediction_id];
            if (isChecked) {
              chart.addPrediction({
                id: prediction_id,
                labels: prediction.chart.labels,
                data: prediction.chart.data,
                color: prediction.color
              })
            } else {
              chart.removePrediction(prediction_id)
            }
          });

        });

        $(".checkbox-prediction").on("click", function(event) {
          event.stopPropagation();
          const prediction_id = parseInt(event.target.value, 10);
          const prediction = predictions_map[prediction_id];
          if ($(event.target).prop("checked")) {
            chart.addPrediction({
              id: prediction_id,
              labels: prediction.chart.labels,
              data: prediction.chart.data,
              color: prediction.color
            })
          } else {
            chart.removePrediction(prediction_id)
          }

        });
      },
    });
  });
}
