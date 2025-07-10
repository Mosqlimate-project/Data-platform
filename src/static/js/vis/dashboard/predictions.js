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
  static obj = {}

  constructor(prediction) {
    this.id = prediction.id;
    this.model = prediction.model;
    this.start_date = prediction.start_date;
    this.end_date = prediction.end_date;
    this.year = prediction.year;
    this.description = prediction.description;
    this.disease = prediction.disease;
    this.time_resolution = prediction.time_resolution;
    this.adm_level = prediction.adm_level;
    this.adm_1 = prediction.adm_1;
    this.adm_2 = prediction.adm_2;
    this.scores = prediction.scores;
    this.color = prediction.color;
    this.chart = prediction.chart;

    Prediction.obj[this.id] = this;
  }

  li() {
    return `
      <tr data-widget="expandable-table" aria-expanded="false" class="prediction-row" data-id="${this.id}">
        <td style="" class="${Storage.prediction_ids.includes(this.id) ? 'selected' : ''}" id="td-${this.id}">
          <input type="checkbox" value="${this.id}" id="checkbox-${this.id}" class="checkbox-prediction">
        </td>
        <td style=""><a href="/registry/prediction/${this.id}/" target="_blank">${this.id}</a></td>
        <td style=""><a href="/registry/model/${this.model}/" target="_blank">${this.model}</a></td>
        <td style="">${this.year}</td>
        <td style="">${this.start_date}</td>
        <td style="">${this.end_date}</td>
        <td style="">${this.scores[Storage.score] ?? "-"}</td>
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

    Storage.current.dashboard.lineChart.addPrediction(this)
    Storage.current.dashboard.predictionList.update_date_slider();
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
    Storage.current.dashboard.predictionList.update_date_slider();
  }
}

class Dashboard {
  constructor(dashboard) {
    const self = this;
    this.dashboard = dashboard;
    new Storage(this);

    this.admSelect = new ADMSelect(this);
    this.lineChart = new LineChart('chart');
    this.predictionList = new PredictionList(this);
    this.update();
    this.predictionList.update();

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
      self.update();
    });
  }

  has_changed(vals) {
    const {
      disease: _disease,
      adm_level: _adm_level,
      adm_1: _adm_1,
      adm_2: _adm_2,
      start_window_date: _min_date,
      end_window_date: _max_date
    } = vals;

    if (
      disease === _disease &&
      adm_level === _adm_level &&
      adm_1 === _adm_1 &&
      adm_2 === _adm_2 &&
      min_date === _min_date &&
      max_date === _max_date
    ) {
      return false;
    }

    disease = _disease;
    adm_level = _adm_level;
    adm_1 = _adm_1;
    adm_2 = _adm_2;
    min_date = _min_date;
    max_date = _max_date;
    return true;
  }

  update() {
    this.update_casos({
      disease: Storage.disease,
      adm_level: Storage.adm_level,
      adm_1: Storage.adm_1,
      adm_2: Storage.adm_2,
    });
  }

  async update_casos({ disease, adm_level, adm_1, adm_2 }) {
    if (
      !disease ||
      !adm_level ||
      (adm_level == 1 && !adm_1) ||
      (adm_level == 2 && !adm_2)
    ) {
      this.lineChart?.clear();
      return;
    }

    const start_window_date = Storage.start_window_date;
    const end_window_date = Storage.end_window_date;

    if (!this.has_changed({ disease, adm_level, adm_1, adm_2, start_window_date, end_window_date })) {
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
}


/**
 * @typedef {Object} StorageData
 * @property {number[]|null} prediction_ids
 * @property {string|null} start_window_date
 * @property {string|null} end_window_date
 * @property {number|null} adm_level
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
    this._predictionsPromise = null;

    const data = JSON.parse(localStorage.getItem("dashboards") || "{}");
    const d = this.dashboard.dashboard;

    data[d] = data[d] || {
      prediction_ids: null,
      start_window_date: null,
      end_window_date: null,
      disease: null,
      adm_level: null,
      adm_1: null,
      adm_2: null,
      score: null,
    };

    if (prediction != null) {
      data[d].prediction_ids = [prediction.id];
      data[d].disease = prediction.disease;
      data[d].adm_level = prediction.adm_level;
      data[d].adm_1 = prediction.adm_1;
      data[d].adm_2 = prediction.adm_2;
    } else {
      data[d].prediction_ids = data[d].prediction_ids || [];
    }

    if (!data[d].start_window_date) data[d].start_window_date = min_window_date;
    if (!data[d].end_window_date) data[d].end_window_date = max_window_date;
    if (!data[d].adm_level) data[d].adm_level = adm_level;
    data[d].disease = data[d].disease || null;
    data[d].adm_1 = data[d].adm_1 || null;
    data[d].adm_2 = data[d].adm_2 || null;
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
    if (this.data.prediction_ids === val) return
    this.data.prediction_ids = val;
    this._save();
  }

  /** @returns {string|null} */
  get start_window_date() {
    return this.data.start_window_date;
  }

  /** @param {string|null} val */
  set start_window_date(val) {
    if (this.data.start_window_date === val) return
    this.data.start_window_date = val;
    this._save();
  }

  /** @returns {string|null} */
  get end_window_date() {
    return this.data.end_window_date;
  }

  /** @param {string|null} val */
  set end_window_date(val) {
    if (this.data.end_window_date === val) return
    this.data.end_window_date = val;
    this._save();
  }

  /** @returns {string|null} */
  get disease() {
    return this.data.disease;
  }

  /** @param {string|null} val */
  set disease(val) {
    if (this.data.disease === val) return
    this.data.disease = val;
    this._save();
  }

  /** @returns {number|null} */
  get adm_level() {
    return this.data.adm_level;
  }

  /** @param {number|null} val */
  set adm_level(val) {
    if (this.data.adm_level === val) return
    this.data.adm_level = val;
    this._save();
  }

  /** @returns {number|null} */
  get adm_1() {
    return this.data.adm_1;
  }

  /** @param {number|null} val */
  set adm_1(val) {
    if (this.data.adm_1 === val) return
    this.data.adm_1 = val;
    this._save();
  }

  /** @returns {number|null} */
  get adm_2() {
    return this.data.adm_2;
  }

  /** @param {number|null} val */
  set adm_2(val) {
    if (this.data.adm_2 === val) return
    this.data.adm_2 = parseInt(val);
    this._save();
  }

  /** @returns {string|null} */
  get score() {
    return this.data.score;
  }

  /** @param {string|null} val */
  set score(val) {
    if (this.data.score === val) return
    this.data.score = val;
    this._save();
  }

  /** @returns {number[]|null} */
  static get prediction_ids() {
    return Storage.current?.prediction_ids ?? [];
  }

  /** @param {number[]|null} val */
  static set prediction_ids(val) {
    if (Storage.current) Storage.current.prediction_ids = val;
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

  /** @returns {string|null} */
  static get disease() {
    return Storage.current?.disease ?? null;
  }

  /** @param {string|null} val */
  static set disease(val) {
    if (Storage.current) Storage.current.disease = val;
  }

  /** @returns {number|null} */
  static get adm_level() {
    return Storage.current?.adm_level ?? null;
  }

  /** @param {number|null} val */
  static set adm_level(val) {
    if (Storage.current) Storage.current.adm_level = val;
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

  /**
   * @returns {Promise<Prediction[]>}
   */
  static get predictions() {
    const url = new URL('/vis/get-predictions/', window.location.origin);
    url.searchParams.append('dashboard', dashboard);
    url.searchParams.append('disease', Storage.disease);
    if (Storage.adm_level) url.searchParams.append('adm_level', Storage.adm_level);
    if (Storage.adm_1) url.searchParams.append('adm_1', Storage.adm_1);
    if (Storage.adm_2) url.searchParams.append('adm_2', Storage.adm_2);

    return fetch(url)
      .then(res => res.ok ? res.json() : { items: [] })
      .then(data => data.items.map(item => new Prediction(item)));
  }
}


class ADMSelect {
  /**
   * @param {Dashboard} dashboard
   */
  constructor(dashboard) {
    const self = this;
    this.selects = {};
    this.dashboard = dashboard;
    this.card = document.querySelector("#params-select");
    this.card.querySelectorAll('select').forEach(select => {
      if (select.id === "disease-filter") return
      const level = parseInt(select.id.replace('adm', '')[0]);
      this.selects[level] = select;
      select.addEventListener('change', () => ADMSelect.onChange(this, level, select.value));
    });

    diseases.forEach(disease => {
      $('<option>')
        .val(disease)
        .text(disease).css('text-transform', 'capitalize')
        .appendTo($('#disease-filter'))
    })

    $('#disease-filter').on('change', function() {
      Storage.disease = $(this).val()
      self.dashboard.update();
      self.dashboard.predictionList?.update();
    })

    if (!Storage.disease) {
      $('#disease-filter').val($('#disease-filter option:first').val()).trigger('change')
    } else {
      $('#disease-filter')
        .val(Storage.disease)
        .trigger('change')
    }

    const adm1 = document.getElementById('toggle-state');
    const adm2 = document.getElementById('toggle-city');

    if (adm_list[1].length === 0) {
      adm1.disabled = true
    }

    if (adm_list[2].length === 0) {
      adm2.disabled = true
    }

    function admSelect(level) {
      if (level === 1) {
        Storage.adm_level = 1;
        adm1.classList.add('btn-primary')
        adm1.classList.remove('btn-outline-primary')
        adm2.classList.remove('btn-primary')
        adm2.classList.add('btn-outline-primary')
        self.populate(1, adm_list[1])
        Storage.adm_2 = null;
      } else if (level === 2) {
        Storage.adm_level = 2;
        adm2.classList.add('btn-primary')
        adm2.classList.remove('btn-outline-primary')
        adm1.classList.remove('btn-primary')
        adm1.classList.add('btn-outline-primary')
        self.populate(1, adm_list[2].map(n => +String(n).slice(0, 2)))
        self.populate(2, adm_list[2])
      }
    }

    adm1.addEventListener('click', () => {
      if (adm1.classList.contains('btn-primary')) return
      admSelect(1)
      self.set(1)
    })

    adm2.addEventListener('click', () => {
      if (adm2.classList.contains('btn-primary')) return
      admSelect(2)
      self.set(2)
    })

    if (Storage.adm_level === 1 || Storage.adm_level === 2) {
      admSelect(Storage.adm_level)
      this.set(Storage.adm_level)
    } else {
      Storage.predictions.then(predictions => {
        if (predictions.length !== 0) {
          admSelect(predictions[0].adm_level)
          this.set(predictions[0].adm_level)
        }
      })
    }
  }

  static onChange(obj, level, value) {
    if (level === 1 && parseInt(value) !== Storage.adm_1) {
      Storage.adm_1 = parseInt(value);
      Storage.current.dashboard.update();
      if (Storage.adm_level === 2) obj.populate(2, adm_list[2]);
      obj.dashboard.predictionList?.update();
    }
    if (level === 2 && parseInt(value) !== Storage.adm_2) {
      Storage.adm_2 = parseInt(value);
      Storage.current.dashboard.update();
      obj.dashboard.predictionList?.update();
    }
  }

  set(level, adm1 = Storage.adm_1, adm2 = Storage.adm_2) {
    if (Storage.adm_1 != adm1) {
      Storage.adm_1 = adm1;
    }

    if (Storage.adm_2 != adm2) {
      Storage.adm_2 = adm2;
    }

    Object.entries(this.selects).forEach(([adm, select]) => {
      adm = parseInt(adm, 10);
      const container = select.closest(`#adm${adm}-select`);

      if (level === null) {
        container.style.display = adm === 1 ? 'block' : 'none';
      }

      if (level === 0) {
        container.style.display = adm === 0 ? 'block' : 'none';
      }

      if (level === 1) {
        container.style.display = adm === 1 ? 'block' : 'none';
      }

      if (level === 2) {
        container.style.display = adm >= 1 && adm <= 2 ? 'block' : 'none';
      }

      if (level === 3) {
        container.style.display = 'block';
      }

      const adm1Opt = [...select.options].find(o => o.value == Storage.adm_1)
      if (adm1Opt) adm1Opt.selected = true

      const adm2Opt = [...select.options].find(o => o.value == Storage.adm_2);
      if (adm2Opt) adm2Opt.selected = true;
    });

    this.dashboard.update();
    this.dashboard.predictionList?.update();
  }

  populate(level, adms) {
    const select = this.selects[level];
    if (!select) return;

    select.options.length = 0;
    const options = get_adm_names(level, adms);

    let hasOpt = false;
    Object.entries(options)
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([value, label]) => {
        const option = Object.assign(document.createElement('option'), {
          value,
          textContent: label
        });
        if (value == Storage.adm_1 || value == Storage.adm_2) {
          option.selected = true;
          hasOpt = true;
        }
        if (level === 2 && !String(value).startsWith(String(Storage.adm_1))) {
          return
        }
        select.appendChild(option);
      });

    if (!hasOpt) {
      if (level === 1) this.set(level, Number(select.options[0].value));
      if (level === 2) this.set(level, null, Number(select.options[0].value));
    }
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

    $("#predictions-clear-all").on("click", function() {
      this.clear()
    });
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

    Storage.predictions.then(predictions => {
      this.predictions = predictions;
      this.list();
    });
    $(`#predictions-card .overlay`).remove();
  }

  sort(predictions, by = this.sort_by, direction = this.sort_direction) {
    this.sort_by = by
    this.sort_direction = direction

    const selected_ids = new Set(Storage.current.prediction_ids || [])
    return predictions.sort((a, b) => {
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
  }

  list(sort_by = this.sort_by, sort_direction = this.sort_direction) {
    if (this.predictions.length === 0) {
      this.paginate([]);
      return
    }

    Storage.prediction_ids.forEach(id => {
      if (!this.predictions.some(prediction => prediction.id === id)) {
        Prediction.obj[id].unselect()
      }
    })

    this.paginate(this.sort(this.predictions, sort_by, sort_direction));
  }

  paginate(predictions) {
    const self = this;
    $('#predictions-pagination').pagination({
      dataSource: predictions,
      pageSize: 10,
      callback: function(data, pagination) {
        const body = data.map((item) => item.li()).join("");
        const score = Storage.score;
        $(`#predictions-list`).html(`
        <thead>
          <tr>
            <th style="width: 40px;">
              <input type="checkbox" id="select-all-checkbox">
            </th>
            <th style="width: 65px;" class="sortable" data-sort="id">ID <span class="sort-arrow"></span></th>
            <th style="width: 65px;" class="sortable" data-sort="model">Model <span class="sort-arrow"></span></th>
            <th style="width: 65px;" class="sortable" data-sort="year">Year <span class="sort-arrow"></span></th>
            <th style="width: 110px;" class="sortable" data-sort="start_date">Start Date <span class="sort-arrow"></span></th>
            <th style="width: 110px;" class="sortable" data-sort="end_date">End Date <span class="sort-arrow"></span></th>
            <th style="width: 150px;">
              <div class="row">
                <div class="col sortable" data-sort="score">Score <span class="sort-arrow"></span></div>
                <div class="col">
                  <select id="scores" title="Score" class="form-select form-select-sm w-auto" style="width: 160px !important;">
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

        const arrow = self.sort_direction === "asc" ? "▲" : "▼";
        $(`#predictions-list .sortable[data-sort="${self.sort_by}"] .sort-arrow`).text(arrow);

        $("#predictions-list .sortable").off("click").on("click", function() {
          const by = $(this).data("sort");
          const dir =
            self.sort_by === by && self.sort_direction === "asc" ? "desc" : "asc";
          self.sort_by = by;
          self.sort_direction = dir;
          self.list(by, dir);
        });

        $(".checkbox-prediction").each(function() {
          const prediction_id = parseInt($(this).val(), 10);
          const td = $(`#td-${prediction_id}`);
          if (Storage.prediction_ids.includes(prediction_id)) {
            $(`.checkbox-prediction[value="${prediction_id}"]`).prop("checked", true);
            Prediction.obj[prediction_id].select();
            td.addClass('selected');
            td.css("background-color", Prediction.obj[prediction_id].color);
          }
        });

        $("#select-all-checkbox").on("click", function() {
          const checked = $(this).prop("checked");
          $(".checkbox-prediction").prop("checked", checked).each(function() {
            const prediction_id = parseInt($(this).val(), 10);
            if (checked) {
              Prediction.obj[prediction_id].select()
            } else {
              Prediction.obj[prediction_id].unselect()
            }
          });
        });

        $(".checkbox-prediction").on("click", function(event) {
          event.stopPropagation();
          const prediction_id = parseInt(event.target.value, 10);

          if ($(event.target).prop("checked")) {
            Prediction.obj[prediction_id].select()
          } else {
            Prediction.obj[prediction_id].unselect()
          }

          self.update();
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
      const predictions = this.predictions.filter(p => Array.from(prediction_ids).includes(p.id));
      [minDate, maxDate] = this.get_min_max_dates(predictions);
    } else {
      [minDate, maxDate] = this.get_min_max_dates(this.predictions);
    }
    $("#date-picker").dateRangeSlider("values", minDate, maxDate);
  }

  set_score(score) {
    Storage.score = score;
    this.dashboard.predictionList.update();
  }

  clear() {
    Storage.prediction_ids.forEach(id => this.unselect(id));
  }
}
