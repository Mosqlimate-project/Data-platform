let storage;
let chart;

let modelList;
let predictionList;
let tagList;

document.addEventListener('DOMContentLoaded', function() {
  $('#tags-card .card-tools button').click()
  storage = new Storage(dashboard);
  tagList = new TagList();

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
      min: new Date(storage.get("start_window_date")),
      max: new Date(storage.get("end_window_date")),
    },
    range: {
      min: { days: 90 },
    },
  });

  $('[data-widget="pushmenu"]').on('click', function() {
    setTimeout(() => {
      dateSlider.dateRangeSlider("resize");
      chart.resize();
    }, 350)
  });

  dateSlider.bind("valuesChanged", function(e, data) {
    storage.set("start_window_date", data.values.min.toISOString().split('T')[0]);
    storage.set("end_window_date", data.values.max.toISOString().split('T')[0]);
    update_casos(dashboard);
  });

  modelList = new ModelList(dashboard);
  predictionList = new PredictionList(dashboard);
});


async function update_casos(dashboard) {
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
  storage.get("tag_ids").forEach((tag_id) => {
    const tag = tagList.all_tags[tag_id];
    if (tag && tag.group) {
      params[tag.group] = parse_tag_name(tag.group, tag.name);
    }
  });

  let disease = params['disease'] || null;
  let time_resolution = params['time_resolution'] || null;
  let adm_level = params['adm_level'] || null;
  let adm_1 = storage.get("adm_1");
  let adm_2 = storage.get("adm_2");

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

    const startDate = new Date(storage.get("start_window_date"));
    const endDate = new Date(storage.get("end_window_date"));

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


class Storage {
  constructor(dashboard) {
    this.dashboard = dashboard;

    let data = localStorage.getItem("dashboards");
    if (!data) { data = {} } else { data = JSON.parse(data) };
    if (!data[this.dashboard]) {
      data[this.dashboard] = {
        prediction_ids: null,
        model_ids: null,
        tag_ids: null,
        start_window_date: null,
        end_window_date: null,
        adm_1: null,
        adm_2: null,
      }
    }
    data[this.dashboard].prediction_ids = data[this.dashboard].prediction_ids || [];
    if (model_id) {
      data[this.dashboard].model_ids = [model_id];
    } else {
      data[this.dashboard].model_ids = data[this.dashboard].model_ids || [];
    }
    data[this.dashboard].tag_ids = data[this.dashboard].tag_ids || [];
    if (!data[this.dashboard].start_window_date) {
      data[this.dashboard].start_window_date = min_window_date;
    }
    if (!data[this.dashboard].end_window_date) {
      data[this.dashboard].end_window_date = max_window_date;
    }
    data[this.dashboard].adm_1 = data[this.dashboard].adm_1 || null;
    data[this.dashboard].adm_2 = data[this.dashboard].adm_2 || null;
    localStorage.setItem("dashboards", JSON.stringify(data));
  }

  get(param) {
    const data = JSON.parse(localStorage.getItem("dashboards"));
    return data[this.dashboard][param];
  }

  set(param, value) {
    let data = JSON.parse(localStorage.getItem("dashboards"));
    data[this.dashboard][param] = value;
    localStorage.setItem("dashboards", JSON.stringify(data));
  }
}

class ModelList {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.get_data();
  }

  async get_data() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = `<i class="fas fa-2x fa-sync-alt fa-spin"></i>`;
    $(overlay).appendTo("#models-card");

    const response = await fetch(`/vis/get-models/?dashboard=${this.dashboard}`);
    if (response.ok) {
      const models = await response.json();
      this.all_models = models['items'];
      this.all_models_map = models['items'].reduce((acc, model) => {
        const { description, ..._ } = model;
        acc[model.id] = _;
        return acc;
      }, {});
      const filter = this.model_filter_by_tags(this.all_models, storage.get("tag_ids"));
      this.current_models = filter;
      this.list(this.current_models);
      $(`#models-card .overlay`).remove();
    }
  }

  model_search(query) {
    const items = current_models.filter((model) =>
      model.id.toString().toLowerCase().includes(query.toLowerCase()) ||
      model.disease.toLowerCase().includes(query.toLowerCase()) ||
      model.time_resolution.toLowerCase().includes(query.toLowerCase()) ||
      model.author.toLowerCase().includes(query.toLowerCase())
    );
    this.list(items);
  }

  li(model) {
    return `
      <tr data-widget="expandable-table" aria-expanded="false">
        <td style="width: 40px;">
          <input type="checkbox" value="${model.id}" id="checkbox-${model.id}" class="checkbox-model">
        </td>
        <td><a href="/registry/model/${model.id}/">${model.id}</a></td>
      </tr>
      <tr class="expandable-body d-none"><td colspan="2"><p>${model.description}</p></td></tr>
    `;
  }

  list(models) {
    models.sort((a, b) => {
      const aChecked = storage.get("model_ids").includes(a.id);
      const bChecked = storage.get("model_ids").includes(b.id);
      if (aChecked && !bChecked) return -1;
      if (!aChecked && bChecked) return 1;
      return 0;
    });

    const self = this;
    $('#models-pagination').pagination({
      dataSource: models,
      pageSize: 5,
      callback: function(data, pagination) {
        const body = data.map((item) => self.li(item)).join("");
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
          if (storage.get("model_ids").includes(model_id)) {
            $(`.checkbox-model[value="${model_id}"]`).prop("checked", true);
          }
        });

        $(".checkbox-model").on("click", function(event) {
          event.stopPropagation();
          const model_id = parseInt(event.target.value, 10);
          if ($(event.target).prop("checked")) {
            self.model_select(model_id);
          } else {
            self.model_unselect(model_id, true);
          }
        });
      },
    });

    $("input[name='models-search']").off("input").on("input", function() {
      self.model_search(this.value, models);
    });
  }

  model_filter_by_tags(models, tag_ids) {
    const tags = Object.fromEntries(
      Object.entries(tagList.all_tags).filter(([key, value]) => tag_ids.includes(parseInt(key)))
    );

    const groups = Object.values(tags).map(tag => tag.group);
    const unique_groups = groups.filter(group => tagList.unique_tag_groups.includes(group));

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

  model_select(model_id) {
    let model_ids = new Set(storage.get("model_ids"));
    let tag_ids = new Set(storage.get("tag_ids"));

    $(`.checkbox-model[value="${model_id}"]`).prop("checked", true);
    $("input[name='models-search']").val("");

    model_ids.add(model_id);
    this.all_models_map[model_id].tags.forEach(tag_id => {
      if (tagList.all_tags[tag_id]) {
        tag_ids.add(tag_id)
      }
    });

    storage.set("model_ids", Array.from(model_ids));
    storage.set("tag_ids", Array.from(tag_ids));

    tag_ids.forEach(id => tagList.tag_select(id));

    const models = this.model_filter_by_tags(this.current_models, storage.get("tag_ids"));
    this.current_models = models;
    this.list(models);
    predictionList.get_data();
  }

  model_unselect(model_id, checkbox = false) {
    let model_ids = new Set(storage.get("model_ids"));
    let tag_ids = new Set(storage.get("tag_ids"));

    $(`.checkbox-model[value="${model_id}"]`).prop("checked", false);
    $("input[name='models-search']").val("");

    if (!this.all_models_map[model_id] || !model_ids.has(model_id)) {
      return;
    }

    model_ids.delete(model_id);

    if (checkbox) {
      const model_tags = this.all_models_map[model_id].tags;
      model_tags.forEach(tag_id => {
        if (
          tag_ids.has(tag_id) &&
          !Array.from(model_ids).some(other_model_id =>
            this.all_models_map[other_model_id].tags.includes(tag_id)
          )
        ) {
          tag_ids.delete(tag_id);
          tagList.tag_unselect(tag_id);
          storage.set("tag_ids", Array.from(tag_ids));
        }
      });
    }

    storage.set("model_ids", Array.from(model_ids));
    storage.set("tag_ids", Array.from(tag_ids));

    let models;
    if (storage.get("model_ids").length > 0) {
      models = this.model_filter_by_tags(this.current_models, storage.get("tag_ids"));
    } else {
      models = this.model_filter_by_tags(this.all_models, storage.get("tag_ids"));
    }
    this.current_models = models;
    this.list(models);
    predictionList.get_data();
  }
}


class PredictionList {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.predictions_map = {};
    this.get_data();
  }

  async get_data() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = `<i class="fas fa-2x fa-sync-alt fa-spin"></i>`;
    $(overlay).appendTo("#predictions-card");

    const url = new URL('/vis/get-predictions/', window.location.origin);
    storage.get("model_ids").forEach(id => url.searchParams.append('model_id', id))

    if (storage.get("model_ids").length === 0) {
      this.list([]);
      $(`#predictions-card .overlay`).remove();
      return;
    }

    const response = await fetch(url);
    if (response.ok) {
      const res = await response.json();
      this.list(res['items']);
      $(`#predictions-card .overlay`).remove();
    }
  }

  li(prediction) {
    return `
      <tr>
        <td style="width: 40px;">
          <input type="checkbox" value="${prediction.id}" id="checkbox-${prediction.id}" class="checkbox-prediction">
        </td>
        <td>${prediction.id}</td>
      </tr>
    `;
  }

  list(predictions) {
    predictions.sort((a, b) => {
      const aChecked = storage.get("prediction_ids").includes(a.id);
      const bChecked = storage.get("prediction_ids").includes(b.id);
      if (aChecked && !bChecked) return -1;
      if (!aChecked && bChecked) return 1;
      return 0;
    });

    const self = this;
    const isAdm2 = predictions.some(prediction => prediction.adm_2 !== null);

    let distinctAdm;
    let adm;
    if (!isAdm2) {
      distinctAdm = [...new Set(predictions.map(prediction => parseInt(prediction.adm_1, 10)))];
      if (!storage.get("adm_1") || !distinctAdm.includes(storage.get("adm_1"))) {
        storage.set("adm_1", distinctAdm[0]);
      }
      adm = storage.get("adm_1")
    } else {
      distinctAdm = [...new Set(predictions.map(prediction => parseInt(prediction.adm_2, 10)))];
      if (!storage.get("adm_2") || !distinctAdm.includes(storage.get("adm_2"))) {
        storage.set("adm_2", distinctAdm[0]);
      }
      adm = storage.get("adm_2")
    }

    const adm_select = `
      <select id="adm-filter" class="form-control" style="width: 100px; margin-left: 10px;">
        ${distinctAdm.map(ADM => `
          <option value="${ADM}" ${ADM === adm ? 'selected' : ''}>${ADM}</option>
        `).join("")}
      </select>
    `;

    $("#predictions-card .card-header .card-tools").html(adm_select);

    const filterPredictions = (selectedAdm) => {
      if (!isAdm2) {
        storage.set("adm_1", parseInt(selectedAdm, 10));
      } else {
        storage.set("adm_2", parseInt(selectedAdm, 10));
      }
      update_casos(this.dashboard);

      let filter = selectedAdm
        ? predictions.filter(
          prediction => prediction.adm_1 == selectedAdm || prediction.adm_2 == selectedAdm
        )
        : predictions;

      self.predictions_map = filter.reduce((acc, prediction) => {
        const { description, ..._ } = prediction;
        acc[prediction.id] = _;
        return acc;
      }, {});

      return filter;
    };

    $('#predictions-pagination').pagination({
      dataSource: filterPredictions(adm),
      pageSize: 5,
      callback: function(data, pagination) {
        const body = data.map((item) => self.li(item)).join("");
        $(`#predictions-list`).html(`
        <thead>
          <tr>
            <th style="width: 40px;">
              <input type="checkbox" id="select-all-checkbox">
            </th>
            <th>id</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      `);

        $(".checkbox-prediction").each(function() {
          const prediction_id = parseInt($(this).val(), 10);
          if (storage.get("prediction_ids").includes(prediction_id)) {
            $(`.checkbox-prediction[value="${prediction_id}"]`).prop("checked", true);
          }
        });

        $("#select-all-checkbox").on("click", function() {
          const isChecked = $(this).prop("checked");
          $(".checkbox-prediction").prop("checked", isChecked).each(function() {
            const prediction_id = parseInt($(this).val(), 10);
            const prediction = self.predictions_map[prediction_id];
            if (isChecked) {
              chart.addPrediction({
                id: prediction_id,
                labels: prediction.chart.labels,
                data: prediction.chart.data,
                upper: prediction.chart.upper,
                lower: prediction.chart.lower,
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
            const prediction = self.predictions_map[prediction_id];
            chart.addPrediction({
              id: prediction_id,
              labels: prediction.chart.labels,
              data: prediction.chart.data,
              upper: prediction.chart.upper,
              lower: prediction.chart.lower,
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
          const body = data.map((item) => self.li(item)).join("");
          $(`#predictions-list`).html(`
          <thead>
            <tr>
              <th style="width: 40px;">
                <input type="checkbox" id="select-all-checkbox">
              </th>
              <th>id</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        `);

          $(".checkbox-prediction").each(function() {
            const prediction_id = parseInt($(this).val(), 10);
            if (storage.get("prediction_ids").includes(prediction_id)) {
              $(`.checkbox-prediction[value="${prediction_id}"]`).prop("checked", true);
            }
          });

          $("#select-all-checkbox").on("click", function() {
            const isChecked = $(this).prop("checked");
            $(".checkbox-prediction").prop("checked", isChecked).each(function() {
              const prediction_id = parseInt($(this).val(), 10);
              const prediction = self.predictions_map[prediction_id];
              if (isChecked) {
                chart.addPrediction({
                  id: prediction_id,
                  labels: prediction.chart.labels,
                  data: prediction.chart.data,
                  upper: prediction.chart.upper,
                  lower: prediction.chart.lower,
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
            const prediction = self.predictions_map[prediction_id];
            if ($(event.target).prop("checked")) {
              chart.addPrediction({
                id: prediction_id,
                labels: prediction.chart.labels,
                data: prediction.chart.data,
                upper: prediction.chart.upper,
                lower: prediction.chart.lower,
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
}


class TagList {
  constructor() {
    this.all_tags = all_tags;
    this.unique_tag_groups = ["disease", "adm_level", "time_resolution"];

    const grouped_tags = Object.entries(this.all_tags).reduce((groups, [id, tag]) => {
      const key = tag.group || 'Others';
      if (!groups[key]) groups[key] = [];
      groups[key].push({ id, ...tag });
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
      return groups;
    }, {});

    const self = this;
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
              self.tag_select(id);
            } else {
              self.tag_unselect(id);
            }
          });

        if (storage.get("tag_ids").includes(parseInt(tag.id))) {
          tag_btn.addClass('active');
        }

        group_div.append(tag_btn);
      });

      if (self.unique_tag_groups.includes(group)) {
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


  tag_select(tag_id) {
    if (!this.all_tags[tag_id]) return;

    const group = this.all_tags[tag_id].group;
    let model_ids = new Set(storage.get("model_ids"));
    let tag_ids = new Set(storage.get("tag_ids"));

    tag_ids.add(tag_id);

    model_ids.forEach(model_id => {
      const model = modelList.all_models_map[model_id];
      if (!model.tags.includes(tag_id)) {
        modelList.model_unselect(model_id);
        model_ids.delete(model_id);
      }
    });

    if (!$(`#tag-${tag_id}`).hasClass('active')) {
      $(`#tag-${tag_id}`).addClass('active');
    }

    if (this.unique_tag_groups.includes(group)) {
      $(`#tag-group-${group}`).find('button').each(function() {
        if (!$(this).hasClass('active')) {
          $(this).prop('disabled', true);
        }
      });
    }

    storage.set("model_ids", Array.from(model_ids));
    storage.set("tag_ids", Array.from(tag_ids));

    let models;
    if (storage.get("model_ids").length > 0) {
      models = modelList.model_filter_by_tags(modelList.current_models, storage.get("tag_ids"));
    } else {
      models = modelList.model_filter_by_tags(modelList.all_models, storage.get("tag_ids"));
    }
    modelList.current_models = models;
    modelList.list(models);
  }

  tag_unselect(tag_id) {
    if (!this.all_tags[tag_id]) return;

    const group = this.all_tags[tag_id].group;
    let model_ids = new Set(storage.get("model_ids"));
    let tag_ids = new Set(storage.get("tag_ids"));

    model_ids.forEach(model_id => {
      const model = modelList.all_models_map[model_id];
      if (model.tags.includes(tag_id)) {
        modelList.model_unselect(model_id);
      }
    });

    tag_ids.delete(tag_id);
    $(`#tag-${tag_id}`).removeClass('active');

    if (this.unique_tag_groups.includes(group)) {
      $(`#tag-group-${group}`).find('button').prop('disabled', false);
    }

    storage.set("tag_ids", Array.from(tag_ids));

    let models;
    if (storage.get("model_ids").length > 0) {
      models = modelList.model_filter_by_tags(modelList.current_models, storage.get("tag_ids"));
    } else {
      models = modelList.model_filter_by_tags(modelList.all_models, storage.get("tag_ids"));
    }
    if (storage.get("model_ids").length === 0 && tag_ids.size === 0) {
      models = modelList.model_filter_by_tags(modelList.all_models, storage.get("tag_ids"));
    }
    modelList.current_models = models;
    modelList.list(models);
  }
}
