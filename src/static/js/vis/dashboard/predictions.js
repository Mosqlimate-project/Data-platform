let d;
let disease = null;
let time_resolution = null;
let adm_level = null;
let adm_1 = null;
let adm_2 = null;
let min_date = null;
let max_date = null;

document.addEventListener('DOMContentLoaded', function() {
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

    this._chart = null;
  }

  get data() { return this._load().then(c => c.data) }
  get labels() { return this._load().then(c => c.labels) }
  get upper_50() { return this._load().then(c => c.upper_50) }
  get upper_90() { return this._load().then(c => c.upper_90) }
  get lower_50() { return this._load().then(c => c.lower_50) }
  get lower_90() { return this._load().then(c => c.lower_90) }

  async _load() {
    if (!this._chart) {
      const url = new URL('/vis/get-prediction-data/', window.location.origin);
      url.searchParams.append('prediction_id', this.id);
      const res = await fetch(url);
      const json = await res.json();
      this._chart = json.data;
    }
    return this._chart;
  }

  li() {
    return `
      <tr data-widget="expandable-table" aria-expanded="false" class="prediction-row" data-id="${this.id}">
        <td style="width: 40px;" class="${Storage.prediction_ids.includes(this.id) ? 'selected' : ''}" id="td-${this.id}">
          <input type="checkbox" value="${this.id}" id="checkbox-${this.id}" class="checkbox-prediction">
        </td>
        <td style="width: 40px;"><a href="/registry/prediction/${this.id}/" target="_blank">${this.id}</a></td>
        <td style="width: 40px;"><a href="/registry/model/${this.model}/" target="_blank">${this.model}</a></td>
        <td style="width: 110px;">${this.start_date}</td>
        <td style="width: 110px;">${this.end_date}</td>
        <td style="width: 150px;">${this.scores[Storage.score] ?? "-"}</td>
      </tr>
      <tr class="expandable-body d-none"><td colspan="6"><p>${this.description}</p></td></tr>
    `;
  }

  select() {
    const td = $(`#td-${this.id}`);
    td.addClass('selected');
    td.css("background-color", this.color);
    $(`.checkbox-prediction[value="${this.id}"]`).prop("checked", true);

    let prediction_ids = new Set(Storage.prediction_ids);
    prediction_ids.add(this.id);
    Storage.prediction_ids = Array.from(prediction_ids);

    Storage.current.dashboard.lineChart.addPrediction({
      id: this.id,
      labels: this.labels,
      data: this.data,
      upper_50: this.upper_50,
      upper_90: this.upper_90,
      lower_50: this.lower_50,
      lower_90: this.lower_90,
      color: this.color
    })
    Storage.current.dashboard.predictionList.update();
  }

  unselect() {
    const td = $(`#td-${this.id}`);
    td.removeClass('selected');
    td.css("background-color", '');
    $(`.checkbox-prediction[value="${this.id}"]`).prop("checked", false);

    let prediction_ids = new Set(Storage.prediction_ids);
    prediction_ids.delete(this.id);
    Storage.prediction_ids = Array.from(prediction_ids);

    Storage.current.dashboard.lineChart.removePrediction(this.id);
    Storage.current.dashboard.predictionList.update();
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

  li() {
    return `
      <tr data-widget="expandable-table" aria-expanded="false">
        <td style="max-width: 40px;">
          <input type="checkbox" value="${this.id}" id="checkbox-${this.id}" class="checkbox-model">
        </td>
        <td><a href="/registry/model/${this.id}/">${this.id}</a></td>
        <td class="truncate-name" title="${this.name}">${this.name}</td>
        <td class="truncate-name"><a href="/${this.author.username}/">${this.author.name}</a></td>
        <td class="truncate-name">${this.updated}</td>
      </tr>
      <tr class="expandable-body d-none"><td colspan="5"><p>${this.description}</p></td></tr>
    `;
  }

  select() {
    $(`.checkbox-model[value="${this.id}"]`).prop("checked", true);
    $("input[name='models-search']").val("");

    let selected_models = new Set(Storage.model_ids);
    selected_models.add(this.id);
    Storage.model_ids = Array.from(selected_models);

    Storage.current.dashboard.modelList.update();
    Storage.current.dashboard.predictionList.update();
    Storage.current.dashboard.update();
  }

  unselect() {
    $(`.checkbox-model[value="${this.id}"]`).prop("checked", false);
    $("input[name='models-search']").val("");

    let selected_models = new Set(Storage.model_ids);
    selected_models.delete(this.id);
    Storage.model_ids = Array.from(selected_models);

    Storage.current.dashboard.modelList.update();
    Storage.current.dashboard.predictionList.update();
    Storage.current.dashboard.update();
  }
}


class Dashboard {
  constructor(dashboard) {
    const self = this;
    this.dashboard = dashboard;

    new Storage(this);
    this.lineChart = new LineChart('chart');
    this.modelList = new ModelList(this);
    this.predictionList = new PredictionList(this);

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


class ADMSelect {
  constructor(dashboard) {
    this.selects = {};
    this.card = document.querySelector(`#adm-select-${dashboard}`);
    this.card.querySelectorAll('select').forEach(select => {
      const level = parseInt(select.id.replace('adm', '')[0]);
      this.selects[level] = select;
      select.addEventListener('change', () => ADMSelect.onChange(level, select.value));
    });
  }

  static onChange(level, value) {
    console.log(`Level ${level} changed to: ${value}`);
  }

  set(level) {
    Object.entries(this.selects).forEach(([adm, select]) => {
      adm = parseInt(adm, 10);
      const container = select.closest(`#adm${adm}-select`);

      if (!level) {
        container.style.display = (adm === 1) ? 'block' : 'none';
      } else if (level === 0) {
        container.style.display = (adm === 0) ? 'block' : 'none';
      } else if (level === 1) {
        container.style.display = (adm === 1) ? 'block' : 'none';
      } else if (level === 2) {
        container.style.display = (adm >= 1 && adm <= 2) ? 'block' : 'none';
      } else if (level === 3) {
        container.style.display = 'block';
      }
    });
  }

  populate(level, options) {
    const select = this.selects[level];
    if (!select) return;

    select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    options.forEach(opt => {
      const optionEl = document.createElement('option');
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      select.appendChild(optionEl);
    });
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

  select(model_id) {
    const model = this.models.find(m => m.id === model_id);
    if (model) model.select();
  }

  list(models) {
    if (!this.models_copy.length) {
      this.models_copy = [...models];
    }
    this.models = models;

    models.sort((a, b) => {
      const aChecked = Storage.model_ids.includes(a.id);
      const bChecked = Storage.model_ids.includes(b.id);
      if (aChecked && !bChecked) return -1;
      if (!aChecked && bChecked) return 1;
      return 0;
    });

    const self = this;
    $('#models-pagination').pagination({
      dataSource: models,
      pageSize: 5,
      callback: function(data, pagination) {
        const body = data.map((model) => model.li()).join("");
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
          if (Storage.model_ids.includes(model_id)) {
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

  extract_adm1(models) {
    let adm1List = [...new Set(models.flatMap(model => model.adm_1_list))];
    const adm1Names = get_adm_names(1, adm1List);
    return adm1List.map(value => [value, adm1Names[value]]);
  }
}

class PredictionList {
  /**
   * @param {Dashboard} dashboard
   */
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.predictions = [];
    this.sort_by = "score";
    this.sort_direction = "desc"
    this.update();
  }

  async update() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = `<i class="fas fa-2x fa-sync-alt fa-spin"></i>`;
    $(overlay).appendTo("#predictions-card");

    if (Storage.model_ids.length === 0) {
      Storage.current.dashboard.lineChart.clear();
      this.predictions = [];
    } else {

    }

    this.sort();
    this.list();
    $(`#predictions-card .overlay`).remove();
  }

  sort(by = this.sort_by, direction = this.sort_direction) {
    this.sort_by = by
    this.sort_direction = direction

    const selected_ids = new Set(Storage.current.prediction_ids || [])
    this.predictions.sort((a, b) => {
      let aVal, bVal
      if (selected_ids.has(a.id) && !selected_ids.has(b.id)) return -1
      if (!selected_ids.has(a.id) && selected_ids.has(b.id)) return 1
      if (by !== "score") {
        aVal = a[by]
        bVal = b[by]
      } else {
        aVal = a.scores?.[Storage.current.score] ?? Infinity
        bVal = b.scores?.[Storage.current.score] ?? Infinity
      }
      if (aVal < bVal) return direction === "asc" ? -1 : 1
      if (aVal > bVal) return direction === "asc" ? 1 : -1
      return 0
    })
    this.list()
  }

  list() {
    if (this.predictions.length === 0) {
      this.paginate([]);
      return
    }

    const self = this;
    const isAdm2 = predictions.some(prediction => prediction.adm_2 !== null);

    Storage.prediction_ids.forEach(id => {
      if (!predictions.some(prediction => prediction.id === id)) {
        self.unselect(id)
      }
    })

    if (!isAdm2) {
      const adm1List = this.extract_adm1(predictions);
      if (
        !Storage.adm_1 ||
        !adm1List.some(([value, _]) => value === Storage.adm_1)
      ) {
        this.dashboard.storage.set("adm_1", parseInt(adm1List[0][0]));
      }

      $('#adm1-filter').empty();

      adm1List.forEach(([value, text]) => {
        const isSelected = value === Storage.adm_1;
        $('#adm1-filter').append($('<option>', {
          value: value,
          text: text,
          selected: isSelected
        }));
      });

      self.paginate(self.filter(predictions, 1, Storage.adm_1))

      $("#adm1-filter").off("change").on("change", function() {
        self.clear()
        self.dashboard.lineChart.clearPredictions();
        self.paginate(self.filter(predictions, 1, $(this).val()));
      });
    } else {
      const adm1List = this.extract_adm1(predictions);

      let adm1 = Storage.adm_1;
      let adm2 = Storage.adm_2;
      if (!adm2 || !adm1List.some(([code]) => String(adm2).startsWith(String(code)))) {
        if (!adm1 || !adm1List.some(([code]) => code === adm1)) {
          adm1 = adm1List[0][0];
          const adm2List = this.extract_adm2(predictions, adm1);
          const adm2 = adm2List.find(([geocode, name]) => String(geocode).startsWith(String(adm1)));
          this.dashboard.storage.set("adm_1", parseInt(adm1));
          this.dashboard.storage.set("adm_2", parseInt(adm2[0]));
        } else {
          const adm2List = this.extract_adm2(predictions, adm1);
          adm2 = adm2List.find(([geocode, name]) => String(geocode).startsWith(String(adm1)));
          this.dashboard.storage.set("adm_2", parseInt(adm2[0]));
        }
      } else {
        this.dashboard.storage.set("adm_1", parseInt(String(Storage.adm_2).slice(0, 2), 10));
      }

      this.paginate(this.filter(predictions, 2, Storage.adm_2));
      const adm2List = this.extract_adm2(predictions, Storage.adm_1);

      $('#adm1-filter').empty();
      adm1List.forEach(([code, name]) => {
        const isSelected = code === Storage.adm_1;
        $('#adm1-filter').append($('<option>', {
          value: code,
          text: name,
          selected: isSelected
        }));
      });

      $('#adm2-filter').empty();
      adm2List.forEach(([geocode, name]) => {
        const isSelected = geocode === Storage.adm_2;
        $('#adm2-filter').append($('<option>', {
          value: geocode,
          text: name,
          selected: isSelected
        }));
      });

      $("#adm1-filter").off("change").on("change", function() {
        self.dashboard.lineChart.clearPredictions();
        self.clear()

        Storage.adm_1 = parseInt($(this).val());
        const adm2List = self.extract_adm2(predictions, $(this).val());

        let adm2 = Storage.adm_2;
        if (!adm2 || !adm2List.some(([geocode]) => geocode === adm2) || !String(adm2).startsWith(String($(this).val()))) {
          adm2 = adm2List[0][0];
          Storage.adm_2 = adm2;
        }

        $('#adm2-filter').empty();
        adm2List.forEach(([geocode, name]) => {
          const isSelected = geocode === Storage.adm_2;
          $('#adm2-filter').append($('<option>', {
            value: geocode,
            text: name,
            selected: isSelected
          }));
        });

        self.paginate(self.filter(predictions, 2, Storage.adm_2));
      });
    }

    $("#predictions-clear-all").on("click", function() {
      self.clear()
    });
  }

  filter(predictions, adm_level, adm) {
    let res;
    this.dashboard.set_adm_level(adm_level);
    if (adm_level === 1) {
      this.dashboard.storage.set("adm_1", parseInt(adm, 10));
      res = predictions.filter(prediction => prediction.adm_1 == adm);
    } else {
      this.dashboard.storage.set("adm_2", parseInt(adm, 10));
      res = predictions.filter(prediction => prediction.adm_2 == adm);
    }
    const params = {
      disease: this.dashboard.tagList.get_disease(),
      time_resolution: this.dashboard.tagList.get_time_resolution(),
      adm_level: adm_level,
    };
    params[`adm_${adm_level}`] = parseInt(adm);

    this.dashboard.update_casos(params);

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
        const body = data.map((item) => item.li()).join("");
        const score = Storage.score;
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
          if (Storage.prediction_ids.includes(prediction_id)) {
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

  get_min_max_dates(predictions) {
    const min = new Date(Math.min(...predictions.map(prediction => new Date(prediction.start_date))));
    const max = new Date(Math.max(...predictions.map(prediction => new Date(prediction.end_date))));

    return [min, max]
  }

  async update_date_slider() {
    const prediction_ids = new Set(Storage.prediction_ids);
    let minDate, maxDate;

    if (prediction_ids.size) {
      const predictions = this.current_predictions.filter(p => Array.from(prediction_ids).includes(p.id));
      [minDate, maxDate] = this.get_min_max_dates(predictions);
    } else {
      [minDate, maxDate] = this.get_min_max_dates(this.current_predictions);
    }
    this.dashboard.set_date_range(minDate, maxDate);
  }

  extract_adm1(predictions) {
    let adm1List = [
      ...new Set(predictions.map(prediction => parseInt(prediction.adm_1, 10)))
    ];
    const adm1Names = get_adm_names(1, adm1List);
    adm1List = adm1List.sort((a, b) => adm1Names[a].localeCompare(adm1Names[b]));
    return adm1List.map(value => [value, adm1Names[value]]);
  }

  extract_adm2(predictions, adm1) {
    let adm2List = [
      ...new Set(predictions.map(prediction => parseInt(prediction.adm_2, 10)))
    ];
    const adm2Names = get_adm_names(2, adm2List);
    adm2List = adm2List.filter(adm => adm.toString().startsWith(adm1.toString()));
    adm2List = adm2List.sort((a, b) => adm2Names[a].localeCompare(adm2Names[b]));
    return adm2List.map(geocode => [geocode, adm2Names[geocode]]);
  }

  set_score(score) {
    this.dashboard.storage.set("score", score);
    const url = new URL(window.location);
    url.searchParams.delete("prediction_id");
    history.pushState(null, "", url);
    location.reload();
  }

  clear() {
    Storage.prediction_ids.forEach(id => this.unselect(id));
  }
}
