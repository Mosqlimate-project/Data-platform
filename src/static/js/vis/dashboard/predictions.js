let d;
let disease = null;
let time_resolution = null;
let adm_level = null;
let adm_1 = null;
let adm_2 = null;
let min_date = null;
let max_date = null;

document.addEventListener('DOMContentLoaded', function() {
  $('#tags-card .card-tools button').click()
  d = new Dashboard(dashboard);

  try {
    dateSlider.dateRangeSlider("destroy");
  } catch (err) {
    // console.log(err)
  }
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

class Tag {
  constructor(id, name, group, color) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.group = group;
  }
}

/**
 * @typedef {Object} Author
 * @property {string} name
 * @property {string} user
 */
class Model {
  /**
   * @param {number} id
   * @param {string} name
   * @param {Author} author
   * @param {string} description
   * @param {string} disease
   * @param {string} time_resolution
   * @param {number} adm_level
   * @param {number[]} adm_1_list
   * @param {number[]} tags
   * @param {string} updated
   */
  constructor(
    id,
    name,
    author,
    description,
    disease,
    time_resolution,
    adm_level,
    adm_1_list,
    tags,
    updated,
  ) {
    this.id = id;
    this.name = name;
    this.author = author;
    this.description = description;
    this.disease = disease;
    this.time_resolution = time_resolution;
    this.adm_level = adm_level;
    this.adm_1_list = adm_1_list;
    this.tags = tags;
    this.updated = updated;

    this._predictionsPromise = null;
  }

  /**
   * @returns {Promise<Prediction[]>}
   */
  get predictions() {
    if (!this._predictionsPromise) {
      const url = new URL('/vis/get-predictions/', window.location.origin);
      url.searchParams.append('model_id', this.id);

      this._predictionsPromise = fetch(url)
        .then(res => res.ok ? res.json() : { items: [] })
        .then(data => data.items.map(item => new Prediction(item)));
    }
    return this._predictionsPromise;
  }
}


class Dashboard {
  constructor(dashboard) {
    const self = this;
    this.dashboard = dashboard;

    this.tags = Object.entries(all_tags).map(([id, tag]) => new Tag(
      parseInt(id, 10),
      tag.name,
      tag.group,
      tag.color
    ));

    new Storage(this);
    this.lineChart = new LineChart('chart');
    this.modelList = new ModelList(this);
    this.predictionList = new PredictionList(this);
    this.tagList = new TagList(this);

    this.fetch().then(models => {
      this.models = models;
      this.modelList.loading(false);
      this.modelList.list(models);
      Storage.model_ids.forEach(id => this.modelList.select(id));
      if (Storage.model_ids.length == 0) {
        this.set_adm_level(null);
      }
    });



    $(`#date-picker`).dateRangeSlider({
      bounds: {
        min: new Date(min_window_date),
        max: new Date(max_window_date),
      },
      defaultValues: {
        min: new Date(Storage.start_window_date),
        max: new Date(Storage.end_window_date),
      },
      range: {
        min: { days: 90 },
      },
    });

    $(`#date-picker`).bind("valuesChanged", function(e, data) {
      const start = data.values.min.toISOString().split('T')[0];
      const end = data.values.max.toISOString().split('T')[0];
      Storage.start_window_date = start;
      Storage.end_window_date = end;

      const adm_level = self.tagList.get_adm_level();
      const params = {
        disease: self.tagList.get_disease(),
        time_resolution: self.tagList.get_time_resolution(),
        adm_level: adm_level,
      };

      if (adm_level === 1) {
        params["adm_1"] = Storage.adm_1;
      } else if (adm_level === 2) {
        params["adm_2"] = Storage.adm_2;
      }

      self.update_casos(params);
    });
  }

  /**
  * @returns {Model[]}
  */
  async fetch() {
    const response = await fetch(`/vis/get-models/?dashboard=${this.dashboard}`);
    if (response.ok) {
      const data = await response.json();
      return data['items'].map(model => new Model(
        model.id,
        model.name,
        model.author,
        model.description,
        model.disease,
        model.time_resolution,
        model.adm_level,
        model.adm_1_list,
        model.tags,
        model.updated
      )
      );
    }
    return [];
  }

  has_changed(vals) {
    const {
      disease: _disease,
      time_resolution: _time_resolution,
      adm_level: _adm_level,
      adm_1: _adm_1,
      adm_2: _adm_2,
      start_window_date: _min_date,
      end_window_date: _max_date
    } = vals;

    if (
      disease === _disease &&
      time_resolution === _time_resolution &&
      adm_level === _adm_level &&
      adm_1 === _adm_1 &&
      adm_2 === _adm_2 &&
      min_date === _min_date &&
      max_date === _max_date
    ) {
      return false;
    }

    disease = _disease;
    time_resolution = _time_resolution;
    adm_level = _adm_level;
    adm_1 = _adm_1;
    adm_2 = _adm_2;
    min_date = _min_date;
    max_date = _max_date;
    return true;
  }

  async update_casos({ disease, time_resolution, adm_level, adm_1, adm_2 }) {
    if (
      !disease ||
      !time_resolution ||
      !adm_level ||
      (adm_level == 1 && !adm_1) ||
      (adm_level == 2 && !adm_2)
    ) {
      this.lineChart.clear();
      return;
    }

    const start_window_date = Storage.start_window_date;
    const end_window_date = Storage.end_window_date;

    if (!this.has_changed({ disease, time_resolution, adm_level, adm_1, adm_2, start_window_date, end_window_date })) {
      return;
    }

    const url_params = new URLSearchParams();
    url_params.append('dashboard', this.dashboard);
    url_params.append('disease', disease);
    url_params.append('adm-level', adm_level);

    if (adm_level === 1) {
      url_params.append('adm-1', adm_1);
    } else if (adm_level === 2) {
      url_params.append('adm-2', adm_2);
    }

    try {
      const res = await new Promise((resolve, reject) => {
        $.ajax({
          type: 'GET',
          url: '/vis/get-hist-alerta-data/',
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

      this.lineChart.updateCases(Object.keys(res), Object.values(res));
      this.lineChart.reapplyPredictions();
    } catch (error) {
      console.error(error);
    }
  }

  set_date_range(start, end) {
    $("#date-picker").dateRangeSlider("values", new Date(start), new Date(end));
  }

  /**
  * @param {Number} adm_level
  * 0, 1, 2 or 3
  */
  set_adm_level(adm_level) {
    if (!adm_level) {
      $("#adm0-select").hide()
      $("#adm1-select").show()
      this.clear_adm_level()
      $("#adm2-select").hide()
      $("#adm3-select").hide()
    }

    if (adm_level === 0) {
      $("#adm0-select").show()
      $("#adm1-select").hide()
      $("#adm2-select").hide()
      $("#adm3-select").hide()
    }
    if (adm_level === 1) {
      $("#adm0-select").hide()
      $("#adm1-select").show()
      $("#adm2-select").hide()
      $("#adm3-select").hide()
    }
    if (adm_level === 2) {
      $("#adm0-select").hide()
      $("#adm1-select").show()
      $("#adm2-select").show()
      $("#adm3-select").hide()
    }
    if (adm_level === 3) {
      $("#adm0-select").show()
      $("#adm1-select").show()
      $("#adm2-select").show()
      $("#adm3-select").show()
    }
  }

  clear_adm_level() {
    const self = this;

    $("#adm1-filter").empty()
    $('#adm1-filter').append($('<option>', {
      value: "",
      text: "Select a State",
      selected: true,
      disabled: true,
    }));

    const adm1List = this.modelList.extract_adm1(this.modelList.models);

    adm1List.forEach(([code, name]) => {
      $('#adm1-filter').append($('<option>', {
        value: code,
        text: name,
        selected: false
      }));
    });

    $("#adm1-filter").off("change").on("change", function() {
      const adm1 = $(this).val();
      if (!adm1 || adm1 === "") {
        Storage.adm_1 = null;
        self.modelList.list(self.models);
      } else {
        Storage.adm_1 = parseInt(adm1);
        const models = self.models.filter(model => model.adm_1_list.includes(parseInt(adm1)));
        self.modelList.list(models);
      }
    });
  }
}


/**
 * @typedef {Object} StorageData
 * @property {number[]|null} prediction_ids
 * @property {number[]|null} model_ids
 * @property {number[]|null} tag_ids
 * @property {string|null} start_window_date
 * @property {string|null} end_window_date
 * @property {number|null} adm_1
 * @property {number|null} adm_2
 * @property {string|null} score
 */

/**
 * @typedef {Object} Dashboard
 * @property {string} dashboard
 */
class Storage {
  /** @type {Storage | null} */
  static current = null;

  /**
   * @param {Dashboard} dashboard
   */
  constructor(dashboard) {
    /** @type {Dashboard} */
    this.dashboard = dashboard;

    const data = JSON.parse(localStorage.getItem("dashboards") || "{}");
    const d = this.dashboard.dashboard;

    data[d] = data[d] || {
      prediction_ids: null,
      model_ids: null,
      tag_ids: null,
      start_window_date: null,
      end_window_date: null,
      adm_1: null,
      adm_2: null,
      score: null,
    };

    data[d].prediction_ids = typeof prediction_id !== "undefined" ? [prediction_id] : data[d].prediction_ids || [];
    data[d].model_ids = typeof model_id !== "undefined" ? [model_id] : data[d].model_ids || [];
    data[d].tag_ids = data[d].tag_ids || [];

    if (!data[d].start_window_date) data[d].start_window_date = min_window_date;
    if (!data[d].end_window_date) data[d].end_window_date = max_window_date;

    data[d].adm_1 = typeof adm_1_v !== "undefined" ? adm_1_v : data[d].adm_1 ?? null;
    data[d].adm_2 = typeof adm_2_v !== "undefined" ? adm_2_v : data[d].adm_2 ?? null;
    data[d].score = data[d].score || "mae";

    /** @type {Object<string, StorageData>} */
    this._data = data;

    this._save();
    Storage.current = this;
  }

  _save() {
    localStorage.setItem("dashboards", JSON.stringify(this._data));
  }

  /** @returns {StorageData} */
  get data() {
    return this._data[this.dashboard.dashboard];
  }

  /** @param {StorageData} data */
  set data(data) {
    this._data[this.dashboard.dashboard] = data;
    this._save();
  }

  /** @returns {number[]|null} */
  get prediction_ids() {
    return this.data.prediction_ids;
  }

  /** @param {number[]|null} val */
  set prediction_ids(val) {
    this.data.prediction_ids = val;
    this._save();
  }

  /** @returns {number[]|null} */
  get model_ids() {
    return this.data.model_ids;
  }

  /** @param {number[]|null} val */
  set model_ids(val) {
    this.data.model_ids = val;
    this._save();
  }

  /** @returns {number[]|null} */
  get tag_ids() {
    return this.data.tag_ids;
  }

  /** @param {number[]|null} val */
  set tag_ids(val) {
    this.data.tag_ids = val;
    this._save();
  }

  /** @returns {string|null} */
  get start_window_date() {
    return this.data.start_window_date;
  }

  /** @param {string|null} val */
  set start_window_date(val) {
    this.data.start_window_date = val;
    this._save();
  }

  /** @returns {string|null} */
  get end_window_date() {
    return this.data.end_window_date;
  }

  /** @param {string|null} val */
  set end_window_date(val) {
    this.data.end_window_date = val;
    this._save();
  }

  /** @returns {number|null} */
  get adm_1() {
    return this.data.adm_1;
  }

  /** @param {number|null} val */
  set adm_1(val) {
    this.data.adm_1 = val;
    this._save();
  }

  /** @returns {number|null} */
  get adm_2() {
    return this.data.adm_2;
  }

  /** @param {number|null} val */
  set adm_2(val) {
    this.data.adm_2 = val;
    this._save();
  }

  /** @returns {string|null} */
  get score() {
    return this.data.score;
  }

  /** @param {string|null} val */
  set score(val) {
    this.data.score = val;
    this._save();
  }

  /** @returns {number[]|null} */
  static get prediction_ids() {
    return Storage.current?.prediction_ids ?? null;
  }

  /** @param {number[]|null} val */
  static set prediction_ids(val) {
    if (Storage.current) Storage.current.prediction_ids = val;
  }

  /** @returns {number[]|null} */
  static get model_ids() {
    return Storage.current?.model_ids ?? null;
  }

  /** @param {number[]|null} val */
  static set model_ids(val) {
    if (Storage.current) Storage.current.model_ids = val;
  }

  /** @returns {number[]|null} */
  static get tag_ids() {
    return Storage.current?.tag_ids ?? null;
  }

  /** @param {number[]|null} val */
  static set tag_ids(val) {
    if (Storage.current) Storage.current.tag_ids = val;
  }

  /** @returns {string|null} */
  static get start_window_date() {
    return Storage.current?.start_window_date ?? null;
  }

  /** @param {string|null} val */
  static set start_window_date(val) {
    if (Storage.current) Storage.current.start_window_date = val;
  }

  /** @returns {string|null} */
  static get end_window_date() {
    return Storage.current?.end_window_date ?? null;
  }

  /** @param {string|null} val */
  static set end_window_date(val) {
    if (Storage.current) Storage.current.end_window_date = val;
  }

  /** @returns {number|null} */
  static get adm_1() {
    return Storage.current?.adm_1 ?? null;
  }

  /** @param {number|null} val */
  static set adm_1(val) {
    if (Storage.current) Storage.current.adm_1 = val;
  }

  /** @returns {number|null} */
  static get adm_2() {
    return Storage.current?.adm_2 ?? null;
  }

  /** @param {number|null} val */
  static set adm_2(val) {
    if (Storage.current) Storage.current.adm_2 = val;
  }

  /** @returns {string|null} */
  static get score() {
    return Storage.current?.score ?? null;
  }

  /** @param {string|null} val */
  static set score(val) {
    if (Storage.current) Storage.current.score = val;
  }
}


class ModelList {
  /**
   * @param {Dashboard} dashboard
   */
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.models = [];
    this.models_copy = [];
    this.loading(true);
  }

  loading(isLoading) {
    if (isLoading) {
      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.style.display = 'flex';
      overlay.style.flexDirection = 'column';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.innerHTML = `<i class="fas fa-2x fa-sync-alt fa-spin"></i>`;
      $(overlay).appendTo("#models-card");
    } else {
      $(`#models-card .overlay`).remove();
    }
  }

  model_search(query) {
    const models = this.models_copy.filter((model) =>
      model.id.toString().toLowerCase().includes(query.toLowerCase()) ||
      model.name.toLowerCase().includes(query.toLowerCase()) ||
      model.disease.toLowerCase().includes(query.toLowerCase()) ||
      model.time_resolution.toLowerCase().includes(query.toLowerCase()) ||
      model.author.name.toLowerCase().includes(query.toLowerCase()) ||
      model.author.user.toLowerCase().includes(query.toLowerCase())
    );

    this.list(models);
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
    if (!this.models_copy.length) {
      this.models_copy = [...models];
    }
    this.models = models;

    models.sort((a, b) => {
      const aChecked = this.dashboard.storage.get("model_ids").includes(a.id);
      const bChecked = this.dashboard.storage.get("model_ids").includes(b.id);
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
          if (self.dashboard.storage.get("model_ids").includes(model_id)) {
            $(`.checkbox-model[value="${model_id}"]`).prop("checked", true);
          }
        });

        $(".checkbox-model").on("click", function(event) {
          event.stopPropagation();
          const model_id = parseInt(event.target.value, 10);
          if ($(event.target).prop("checked")) {
            self.select(model_id);
          } else {
            self.unselect(model_id);
          }
        });
      },
    });

    $("input[name='models-search']").off("input").on("input", function() {
      self.model_search(this.value);
    });
  }

  select(model_id) {
    const model = this.dashboard.models.find(model => model.id === model_id);

    $(`.checkbox-model[value="${model.id}"]`).prop("checked", true);
    $("input[name='models-search']").val("");

    let selected_models = new Set(this.dashboard.storage.get("model_ids"));
    selected_models.add(model.id);
    this.dashboard.storage.set("model_ids", Array.from(selected_models));

    this.dashboard.tagList.select(model);
    this.dashboard.predictionList.update();

    const params = {
      disease: this.dashboard.tagList.get_disease(),
      time_resolution: this.dashboard.tagList.get_time_resolution(),
      adm_level: model.adm_level,
    };

    if (adm_level === 1) {
      params["adm_1"] = this.dashboard.storage.get("adm_1");
    } else if (adm_level === 2) {
      params["adm_2"] = this.dashboard.storage.get("adm_2");
    }

    this.dashboard.update_casos(params);
  }

  unselect(model_id, from_tag = false) {
    const model = this.dashboard.models.find(model => model.id === model_id);

    $(`.checkbox-model[value="${model_id}"]`).prop("checked", false);
    $("input[name='models-search']").val("");

    let selected_models = new Set(this.dashboard.storage.get("model_ids"));
    selected_models.delete(model.id);
    this.dashboard.storage.set("model_ids", Array.from(selected_models));

    if (!from_tag) {
      this.dashboard.tagList.unselect(model);
    }
    this.dashboard.predictionList.update();
  }

  extract_adm1(models) {
    let adm1List = [...new Set(models.flatMap(model => model.adm_1_list))];
    const adm1Names = get_adm_names(1, adm1List);
    return adm1List.map(value => [value, adm1Names[value]]);
  }
}

class Prediction {
  constructor(prediction) {
    this.id = prediction.id;

    this.model = prediction.model;
    this.start_date = prediction.start_date;
    this.end_date = prediction.end_date;
    this.description = prediction.description;
    this.adm_1 = prediction.adm_1;
    this.adm_2 = prediction.adm_2;
    this.scores = prediction.scores;
    this.color = prediction.color;

    this.labels = prediction.chart.labels;
    this.data = prediction.chart.data;
    this.upper_50 = prediction.chart.upper_50;
    this.upper_90 = prediction.chart.upper_90;
    this.lower_50 = prediction.chart.lower_50;
    this.lower_90 = prediction.chart.lower_90;
  }

  li() {
    const selected = this.dashboard.storage.get("prediction_ids").includes(this.id);
    const score = this.dashboard.storage.get("score");

    return `
      <tr data-widget="expandable-table" aria-expanded="false" class="prediction-row" data-id="${this.id}">
        <td style="width: 40px;" class="${selected ? 'selected' : ''}" id="td-${this.id}">
          <input type="checkbox" value="${this.id}" id="checkbox-${this.id}" class="checkbox-prediction">
        </td>
        <td style="width: 40px;"><a href="/registry/prediction/${this.id}/" target="_blank">${this.id}</a></td>
        <td style="width: 40px;"><a href="/registry/model/${this.model}/" target="_blank">${this.model}</a></td>
        <td style="width: 110px;">${this.start_date}</td>
        <td style="width: 110px;">${this.end_date}</td>
        <td style="width: 150px;">${this.scores[score] ?? "-"}</td>
      </tr>
      <tr class="expandable-body d-none"><td colspan="6"><p>${this.description}</p></td></tr>
    `;
  }
}

class PredictionList {
  /**
   * @param {Dashboard} dashboard
   */
  constructor(dashboard) {
    const self = this;
    this.dashboard = dashboard;
    this.unique_tag_groups = ["disease", "adm_level", "time_resolution", "output"];

    const grouped_tags = this.dashboard.tags.reduce((groups, tag) => {
      const key = tag.group || 'Others';
      if (!groups[key]) groups[key] = [];
      groups[key].push(tag);
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
              self.tag_select(id);
            } else {
              self.tag_unselect(id);
            }
          });

        if (self.dashboard.storage.get("tag_ids").includes(parseInt(tag.id))) {
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

  filter() {
    const tag_ids = this.dashboard.storage.get("tag_ids");
    const model_ids = this.dashboard.storage.get("model_ids");

    if (tag_ids.length === 0) {
      this.dashboard.modelList.list(this.dashboard.models);
      return;
    }

    const tags = this.dashboard.tags.filter(tag => tag_ids.includes(tag.id));
    const models = this.dashboard.models.filter(model => model_ids.includes(model.id));

    const filter = this.dashboard.models.filter(model => {
      const modelTags = model.tags.map(id => parseInt(id, 10));
      return tags.every(tag => modelTags.includes(tag.id));
    });

    models.forEach(model => {
      if (!filter.includes(model)) {
        this.dashboard.modelList.unselect(model.id, true);
      }
    });

    this.dashboard.modelList.list(filter);
  }

  /**
   * @param {Model} model
   */
  select(model) {
    model.tags.forEach(id => {
      this.tag_select(id, false)
    })
    this.filter();
  }

  /**
   * @param {Model} model
   */
  unselect(model) {
    const models = this.dashboard.models.filter(model => this.dashboard.storage.get("model_ids").includes(model.id));
    model.tags.forEach(id => {
      const tagInUse = models.some(otherModel => {
        return otherModel.id !== model.id && otherModel.tags.includes(id);
      });
      if (!tagInUse) {
        this.tag_unselect(id, false);
      }
    });
    this.filter();
  }

  tag_select(tag_id, update = true) {
    const tag = this.dashboard.tags.find(tag => tag.id === tag_id);
    if (!tag) { return }

    let tag_ids = new Set(this.dashboard.storage.get("tag_ids"));
    tag_ids.add(tag.id);
    this.dashboard.storage.set("tag_ids", Array.from(tag_ids));

    if (!$(`#tag-${tag.id}`).hasClass('active')) {
      $(`#tag-${tag.id}`).addClass('active');
    }

    if (this.unique_tag_groups.includes(tag.group)) {
      $(`#tag-group-${tag.group}`).find('button').each(function() {
        if (!$(this).hasClass('active')) {
          $(this).prop('disabled', true);
        }
      });
    }

    if (update) {
      this.filter();
    }
  }

  tag_unselect(tag_id, update = true) {
    const tag = this.dashboard.tags.find(tag => String(tag.id) === String(tag_id));
    if (!tag) { return }

    let tag_ids = new Set(this.dashboard.storage.get("tag_ids"));
    tag_ids.delete(tag.id);
    this.dashboard.storage.set("tag_ids", Array.from(tag_ids));

    $(`#tag-${tag.id}`).removeClass('active');
    if (this.unique_tag_groups.includes(tag.group)) {
      $(`#tag-group-${tag.group}`).find('button').prop('disabled', false);
    }

    if (update) {
      this.filter()
    }
  }

  get_adm_level() {
    const tag_ids = this.dashboard.storage.get("tag_ids");
    const tags = this.dashboard.tags.filter(tag => tag_ids.includes(tag.id));

    for (const tag of tags) {
      if (tag.group === "adm_level" && tag.name.includes("ADM ")) {
        const level = parseInt(tag.name.split("ADM ")[1], 10);
        if (!isNaN(level)) {
          return level;
        }
      }
    }

    return null;
  }

  get_disease() {
    const tag_ids = this.dashboard.storage.get("tag_ids");
    const tags = this.dashboard.tags.filter(tag => tag_ids.includes(tag.id));

    let disease;
    for (const tag of tags) {
      if (tag.group === "disease") {
        disease = tag.name.toLowerCase()
      }
    }
    return disease;
  }

  get_time_resolution() {
    const tag_ids = this.dashboard.storage.get("tag_ids");
    const tags = this.dashboard.tags.filter(tag => tag_ids.includes(tag.id));

    let time_resolution;
    for (const tag of tags) {
      if (tag.group === "time_resolution") {
        time_resolution = tag.name.toLowerCase()
      }
    }
    return time_resolution;
  }
}
