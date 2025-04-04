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

  chart.chart.on('finished', function() {
    chart.chart.setOption({
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
    });
  });

  chart.chart.on('legendselectchanged', (params) => {
    chart.chart.setOption({ animation: false });
    chart.chart.dispatchAction({ type: 'legendSelect', name: params.name });
    chart.chart.setOption({ animation: true });
    if (params.name == 'Data') {
      return
    }
    chart.toggleConfidenceBounds(params.name);
  });

  chart.chart.on('click', function(params) {
    if (params.seriesName === "Data") {
      return;
    }
    chart.toggleConfidenceBounds(params.seriesName);
  });


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

  $(".prediction-row").on("mouseenter", function() {
    const index = chart.getIndex($(this).data("id"));
    if (index !== -1) {
      chart.chart.dispatchAction({
        type: 'highlight',
        seriesIndex: index,
        dataIndex: 0
      });
    }
  });

  $(".prediction-row").on("mouseleave", function() {
    const index = chart.getIndex($(this).data("id"));
    if (index !== -1) {
      chart.chart.dispatchAction({
        type: 'downplay',
        seriesIndex: index,
        dataIndex: 0
      });
    }
  });

});


function get_adm_names(admLevel, geocodes) {
  const params = new URLSearchParams();
  params.append("adm_level", admLevel);
  geocodes.forEach(geocode => params.append("geocode", geocode));

  const request = new XMLHttpRequest();
  request.open("GET", `/vis/get-adm-names/?${params.toString()}`, false);
  request.send();

  if (request.status !== 200) {
    throw new Error(request.responseText);
  }

  return JSON.parse(request.responseText);
}


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
  if (storage.get("model_ids").length === 0) {
    chart.clear();
    predictionList.clear();
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
        score: null,
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
    data[this.dashboard].score = data[this.dashboard].score || "mae";
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
    const items = modelList.current_models.filter((model) =>
      model.id.toString().toLowerCase().includes(query.toLowerCase()) ||
      model.name.toLowerCase().includes(query.toLowerCase()) ||
      model.disease.toLowerCase().includes(query.toLowerCase()) ||
      model.time_resolution.toLowerCase().includes(query.toLowerCase()) ||
      model.author.name.toLowerCase().includes(query.toLowerCase()) ||
      model.author.user.toLowerCase().includes(query.toLowerCase())
    );
    this.list(items);
  }

  li(model) {
    return `
      <tr data-widget="expandable-table" aria-expanded="false">
        <td style="max-width: 40px;">
          <input type="checkbox" value="${model.id}" id="checkbox-${model.id}" class="checkbox-model">
        </td>
        <td><a href="/registry/model/${model.id}/">${model.id}</a></td>
        <td class="truncate-name" title="${model.name}">${model.name}</td>
        <td class="truncate-name"><a href="/${model.author.username}/">${model.author.name}</a></td>
        <td class="truncate-name">${model.updated}</td>
      </tr>
      <tr class="expandable-body d-none"><td colspan="5"><p>${model.description}</p></td></tr>
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
              <th style="width: 65px;">ID</th>
              <th>Name</th>
              <th style="width: 150px;">Author</th>
              <th style="width: 130px;">Last update</th>
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
    this.current_predictions = [];
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
    const selected = storage.get("prediction_ids").includes(prediction.id);

    return `
    <tr data-widget="expandable-table" aria-expanded="false" class="prediction-row" data-id="${prediction.id}">
      <td style="width: 40px;" class="${selected ? 'selected' : ''}" id="td-${prediction.id}">
        <input type="checkbox" value="${prediction.id}" id="checkbox-${prediction.id}" class="checkbox-prediction">
      </td>
      <td style="width: 40px;">${prediction.id}</td>
      <td style="width: 40px;"><a href="/registry/model/${prediction.model}/">${prediction.model}</a></td>
      <td style="width: 110px;">${prediction.start_date}</td>
      <td style="width: 110px;">${prediction.end_date}</td>
      <td style="width: 150px;">${prediction.scores[storage.get("score")] || "-"}</td>
    </tr>
    <tr class="expandable-body d-none"><td colspan="6"><p>${prediction.description}</p></td></tr>
  `;
  }

  list(predictions) {
    predictions = [...predictions].sort((a, b) => {
      const aScore = a.scores[storage.get("score")] ?? Infinity;
      const bScore = b.scores[storage.get("score")] ?? Infinity;
      return aScore - bScore;
    });

    const self = this;
    const isAdm2 = predictions.some(prediction => prediction.adm_2 !== null);

    storage.get("prediction_ids").forEach(id => {
      if (!predictions.some(prediction => prediction.id === id)) {
        self.unselect(id)
      }
    })

    let adm;
    if (!isAdm2) {
      let adm1List = [...new Set(predictions.map(prediction => parseInt(prediction.adm_1, 10)))];

      if (!storage.get("adm_1") || !adm1List.includes(storage.get("adm_1"))) {
        storage.set("adm_1", adm1List[0]);
      }

      adm = storage.get("adm_1")
      storage.set("adm_level", 1)

      const adm1_names = get_adm_names(1, adm1List);
      adm1List = adm1List.sort((a, b) => adm1_names[a].localeCompare(adm1_names[b]));

      const adm1_select = `
        <select id="adm1-filter" class="form-select form-select-sm w-auto ms-2">
          ${adm1List.map(ADM => `
            <option value="${ADM}" ${ADM === adm ? 'selected' : ''}>${adm1_names[ADM]}</option>
          `).join("")}
        </select>
      `;

      $("#predictions-card .card-header .card-tools").html(adm1_select);

      self.paginate(self.filter(predictions, 1, adm))

      $("#adm1-filter").on("change", function() {
        storage.set("prediction_ids", []);
        chart.clearPredictions();
        self.paginate(self.filter(predictions, 1, $(this).val()));

        const chartName = `${adm1_names[$(this).val()] || ""}`;
        chart.option.yAxis[0].name = chartName;
        chart.option.yAxis[0].nameTextStyle.padding = [0, 0, 5, Math.min(chartName.length * 2)];
      });

      $("#adm1-filter").change();
    } else {
      let adm2List = [...new Set(predictions.map(prediction => parseInt(prediction.adm_2, 10)))];
      let adm1List = [...new Set(adm2List.map(adm => parseInt(String(adm).slice(0, 2), 10)))];

      storage.set("adm_level", 2);

      if (!storage.get("adm_2") || !adm2List.includes(storage.get("adm_2"))) {
        if (!storage.get("adm_1") || !adm1List.includes(storage.get("adm_1"))) {
          const adm2 = adm2List.find(adm => String(adm).startsWith(String(adm1List[0])));
          storage.set("adm_2", adm2);
          storage.set("adm_1", adm1List[0]);
        } else {
          const adm2 = adm2List.find(adm => String(adm).startsWith(String(storage.get("adm_1"))));
          storage.set("adm_2", adm2);
        }
      } else {
        storage.set("adm_1", parseInt(String(storage.get("adm_2")).slice(0, 2), 10));
      }

      const adm1_names = get_adm_names(1, adm1List);
      const adm1_list = adm1List.sort((a, b) => adm1_names[a].localeCompare(adm1_names[b]));

      let adm2_list = adm2List.filter(adm => adm.toString().startsWith(storage.get("adm_1").toString()));
      const adm2_names = get_adm_names(2, adm2_list);
      adm2_list.sort((a, b) => adm2_names[a].localeCompare(adm2_names[b]));

      const adm1_select = `
        <select id="adm1-filter" class="form-select form-select-sm w-auto ms-2">
          ${adm1_list.map(ADM => `
            <option value="${ADM}" ${ADM === storage.get("adm_1") ? 'selected' : ''}>${adm1_names[ADM]}</option>
          `).join("")}
        </select>
      `;

      const adm2_select = `
        <select id="adm2-filter" class="form-select form-select-sm w-auto ms-2">
          ${adm2_list.map(ADM => `
            <option value="${ADM}" ${ADM === storage.get("adm_2") ? 'selected' : ''}>${adm2_names[ADM]}</option>
          `).join("")}
        </select>
      `;

      $("#predictions-card .card-header .card-tools").html(adm1_select + adm2_select);

      $("#adm1-filter").on("change", function() {
        storage.set("prediction_ids", []);
        chart.clearPredictions();

        let adm2_list = adm2List.filter(adm => String(adm).startsWith(String($(this).val())));
        const adm2_names = get_adm_names(2, adm2_list);
        adm2_list = adm2_list.sort((a, b) => adm2_names[a].localeCompare(adm2_names[b]));

        let adm2 = storage.get("adm_2");
        if (!adm2 || !adm2_list.includes(adm2) || !String(adm2).startsWith(String($(this).val()))) {
          storage.set("adm_2", adm2_list[0]);
        }

        const adm2_select = `
          <select id="adm2-filter" class="form-select form-select-sm w-auto ms-2">
            ${adm2_list.map(ADM => `
              <option value="${ADM}" ${ADM === storage.get("adm_2") ? 'selected' : ''}>${adm2_names[ADM]}</option>
            `).join("")}
          </select>
        `;

        $("#adm2-filter").replaceWith(adm2_select);
        self.paginate(self.filter(predictions, 2, storage.get("adm_2")));

        const chartName = `${adm2_names[storage.get("adm_2")]} - ${adm1_names[$(this).val()]}`;
        chart.option.yAxis[0].name = chartName;
        chart.option.yAxis[0].nameTextStyle.padding = [0, 0, 5, Math.min(chartName.length * 3.5)];
      });

      $("#adm1-filter").change();
    }

    $("#predictions-clear-all").on("click", function() {
      self.clear()
    });
  }

  filter(predictions, adm_level, adm) {
    let res;
    if (adm_level === 1) {
      storage.set("adm_1", parseInt(adm, 10));
      res = predictions.filter(prediction => prediction.adm_1 == adm);
    } else {
      storage.set("adm_2", parseInt(adm, 10));
      res = predictions.filter(prediction => prediction.adm_2 == adm);
    }
    update_casos(this.dashboard);

    this.predictions_map = res.reduce((acc, prediction) => {
      const { description, ..._ } = prediction;
      acc[prediction.id] = _;
      return acc;
    }, {});

    return res;
  };

  paginate(predictions) {
    const self = this;
    this.current_predictions = predictions;
    $('#predictions-pagination').pagination({
      dataSource: predictions,
      pageSize: 5,
      callback: function(data, pagination) {
        const body = data.map((item) => self.li(item)).join("");
        const score = storage.get("score");
        $(`#predictions-list`).html(`
        <thead>
          <tr>
            <th style="width: 40px;">
              <input type="checkbox" id="select-all-checkbox">
            </th>
            <th style="width: 65px;">ID</th>
            <th style="width: 85px;">Model</th>
            <th style="width: 110px;">Start Date</th>
            <th style="width: 110px;">End Date</th>
            <th style="width: 150px;">
              <div class="row">
                <div class="col">Score</div>
                <div class="col">
                  <select id="scores" title="Score" class="form-select form-select-sm w-auto" style="width: 80px !important;">
                    <option value="mae" ${score === "mae" ? "selected" : ""}>MAE</option>
                    <option value="mse" ${score === "mse" ? "selected" : ""}>MSE</option>
                    <option value="crps" ${score === "crps" ? "selected" : ""}>CRPS</option>
                    <option value="log_score" ${score === "log_score" ? "selected" : ""}>Log Score</option>
                    <option value="interval_score" ${score === "interval_score" ? "selected" : ""}>Interval Score</option>
                  </select>
                </div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      `);

        $("#scores").on("change", function() {
          self.set_score($(this).val());
        });

        $(".checkbox-prediction").each(function() {
          const prediction_id = parseInt($(this).val(), 10);
          const td = $(`#td-${prediction_id}`);
          if (storage.get("prediction_ids").includes(prediction_id)) {
            $(`.checkbox-prediction[value="${prediction_id}"]`).prop("checked", true);
            self.select(self.predictions_map[prediction_id]);
            td.addClass('selected');
            td.css("background-color", self.predictions_map[prediction_id].color);
          }
        });

        $("#select-all-checkbox").on("click", function() {
          const checked = $(this).prop("checked");
          $(".checkbox-prediction").prop("checked", checked).each(function() {
            const prediction_id = parseInt($(this).val(), 10);
            if (checked) {
              self.select(self.predictions_map[prediction_id])
            } else {
              self.unselect(prediction_id)
            }
          });
        });

        $(".checkbox-prediction").on("click", function(event) {
          event.stopPropagation();
          const prediction_id = parseInt(event.target.value, 10);

          if ($(event.target).prop("checked")) {
            self.select(self.predictions_map[prediction_id])
          } else {
            self.unselect(prediction_id)
          }
        });

        $("#select-all-checkbox").prop("checked", $(".checkbox-prediction").length === $(".checkbox-prediction:checked").length);
      },
    });
  }

  set_score(score) {
    storage.set("score", score);
    location.reload();
  }

  select(prediction) {
    let prediction_ids = new Set(storage.get("prediction_ids"));

    prediction_ids.add(prediction.id);
    chart.addPrediction({
      id: prediction.id,
      labels: prediction.chart.labels,
      data: prediction.chart.data,
      upper_50: prediction.chart.upper_50,
      upper_90: prediction.chart.upper_90,
      lower_50: prediction.chart.lower_50,
      lower_90: prediction.chart.lower_90,
      color: prediction.color
    })
    storage.set("prediction_ids", Array.from(prediction_ids));

    const td = $(`#td-${prediction.id}`);
    td.addClass('selected');
    td.css("background-color", prediction.color);
  }

  unselect(prediction_id) {
    let prediction_ids = new Set(storage.get("prediction_ids"));
    prediction_ids.delete(prediction_id);
    chart.removePrediction(prediction_id)
    storage.set("prediction_ids", Array.from(prediction_ids));

    const td = $(`#td-${prediction_id}`);
    td.removeClass('selected');
    td.css("background-color", '');
    $(`.checkbox-prediction[value="${prediction_id}"]`).prop("checked", false);
    $("#select-all-checkbox").prop("checked", false);
  }

  clear() {
    storage.get("prediction_ids").forEach(id => this.unselect(id));
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
