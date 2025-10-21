let d;
let disease = null;
let adm_level = null;
let adm_1 = null;
let adm_2 = null;

document.addEventListener('DOMContentLoaded', function() {
  (function($) {
    class LoadingOverlay {
      constructor(container) {
        this.container = container;
        const computedStyle = window.getComputedStyle(container);
        if (computedStyle.position === 'static' || !computedStyle.position) {
          container.style.position = 'relative';
        }
        this.overlay = document.createElement('div');
        this.overlay.classList.add('loading-overlay');
        this.overlay.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
        this.container.appendChild(this.overlay);
      }
      show() {
        this.overlay.classList.add('active');
      }
      hide() {
        this.overlay.classList.remove('active');
      }
      error() {
        this.icon.className = 'fas fa-times';
        this.overlay.classList.add('active');
      }
    }

    $.fn.loading = function(method) {
      return this.each(function() {
        let $this = $(this);
        let overlay = $this.data('loadingOverlayInstance');
        if (!overlay) {
          overlay = new LoadingOverlay(this);
          $this.data('loadingOverlayInstance', overlay);
        }
        if (method === 'show') {
          overlay.show();
        } else if (method === 'hide') {
          overlay.hide();
        } else if (method === 'error') {
          overlay.error();
        }
      });
    };
  })(jQuery);

  d = new Dashboard(dashboard);
});

function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

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


class Dashboard {
  constructor(dashboard) {
    this.dashboard = dashboard;
    new Storage(this);

    this.admSelect = new ADMSelect(this);
    this.lineChart = new LineChart('chart');
    this.update();
  }

  has_changed(vals) {
    const {
      disease: _disease,
      adm_level: _adm_level,
      adm_1: _adm_1,
      adm_2: _adm_2,
    } = vals;

    if (
      disease === _disease &&
      adm_level === _adm_level &&
      adm_1 === _adm_1 &&
      adm_2 === _adm_2
    ) {
      return false;
    }

    disease = _disease;
    adm_level = _adm_level;
    adm_1 = _adm_1;
    adm_2 = _adm_2;
    return true;
  }

  update() {
    $('#chart-card').loading("show")
    try {
      this.update_casos({
        disease: Storage.disease,
        adm_level: Storage.adm_level,
        adm_1: Storage.adm_1,
        adm_2: Storage.adm_2,
      });
    } catch {
      console.error("Dashboard.update() error")
    } finally {
      $('#chart-card').loading("hide")
    }
  }

  async update_casos({ disease, adm_level, adm_1, adm_2 }) {
    if (
      !disease ||
      !adm_level ||
      (adm_level === 1 && !adm_1) ||
      (adm_level === 2 && !adm_2)
    ) {
      this.lineChart?.clear();
      return;
    }

    if (!this.has_changed({ disease, adm_level, adm_1, adm_2 })) {
      return;
    }

    await populateTags({
      sprint: Storage.current.dashboard.dashboard === "sprint",
      disease,
      adm_level,
      adm_1,
      adm_2,
    });

    try {
      const { labels, cases } = await dashboard_line_chart_cases({
        sprint: Storage.current.dashboard.dashboard === "sprint",
        disease,
        adm_level,
        adm_1,
        adm_2,
      });

      this.lineChart.updateCases(labels, cases);
      this.lineChart.clearPredictions();
    } catch (error) {
      console.error("update_casos error:", error);
      this.lineChart?.clear();
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

  static EXPIRATION_MS = 12 * 60 * 60 * 1000;

  /**
   * @param {Dashboard} dashboard
   */
  constructor(dashboard) {
    /** @type {Dashboard} */
    this.dashboard = dashboard;
    this._predictionsPromise = null;

    const metadata = JSON.parse(localStorage.getItem("dashboards_meta") || "{}");

    if (metadata.timestamp && Date.now() - metadata.timestamp > Storage.EXPIRATION_MS) {
      localStorage.clear();
    }

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
    localStorage.setItem("dashboards_meta", JSON.stringify({ timestamp: Date.now() }));
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
      // self.dashboard.predictionList?.update();
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

    if (adm1 && adm_list[1].length === 0) {
      adm1.disabled = true
    }

    if (adm2 && adm_list[2].length === 0) {
      adm2.disabled = true
    }

    function admSelect(level) {
      if (level === 1) {
        Storage.adm_level = 1;
        adm1?.classList.add('btn-primary')
        adm1?.classList.remove('btn-outline-primary')
        adm2?.classList.remove('btn-primary')
        adm2?.classList.add('btn-outline-primary')
        self.populate(1, adm_list[1])
        Storage.adm_2 = null;
      } else if (level === 2) {
        Storage.adm_level = 2;
        adm2?.classList.add('btn-primary')
        adm2?.classList.remove('btn-outline-primary')
        adm1?.classList.remove('btn-primary')
        adm1?.classList.add('btn-outline-primary')
        self.populate(1, adm_list[2].map(n => +String(n).slice(0, 2)))
        self.populate(2, adm_list[2])
      }
    }

    adm1?.addEventListener('click', () => {
      if (adm1.classList.contains('btn-primary')) return
      admSelect(1)
      self.set(1)
    })

    adm2?.addEventListener('click', () => {
      if (adm2.classList.contains('btn-primary')) return
      admSelect(2)
      self.set(2)
    })

    if (Storage.adm_level === 1 || Storage.adm_level === 2) {
      admSelect(Storage.adm_level)
      this.set(Storage.adm_level)
    } else {
      dashboard_predictions({
        sprint: Storage.current.dashboard.dashboard === "sprint",
        disease: Storage.disease,
        adm_level: null,
        adm_1: null,
        adm_2: null,
      }).then(predictions => {
        if (predictions && predictions.length !== 0) {
          admSelect(predictions[0].adm_level)
          this.set(predictions[0].adm_level)
        }
      }).catch(err => {
        console.error("Error fetching predictions for ADMSelect:", err);
      })
    }
  }

  static onChange(obj, level, value) {
    // $('#chart-card').loading("show")
    // $('#predictions-card').loading("show")

    try {
      if (level === 1 && parseInt(value) !== Storage.adm_1) {
        Storage.adm_1 = parseInt(value);
        if (Storage.adm_level === 2) obj.populate(2, adm_list[2]);
        obj.dashboard.update();
        // obj.dashboard.predictionList?.update();
      }
      if (level === 2 && parseInt(value) !== Storage.adm_2) {
        Storage.adm_2 = parseInt(value);
        obj.dashboard.update();
        // obj.dashboard.predictionList?.update();
      }
    } catch {
      // $('#chart-card').loading("error")
      // $('#predictions-card').loading("error")
    } finally {
      // $('#chart-card').loading("hide")
      // $('#predictions-card').loading("hide")
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
        if (level === 2 && !String(value).startsWith(String(Storage.adm_1))) {
          return
        }
        const option = Object.assign(document.createElement('option'), {
          value,
          textContent: label
        });
        if (value == Storage.adm_1 || value == Storage.adm_2) {
          option.selected = true;
          hasOpt = true;
        }
        select.appendChild(option);
      });

    if (!hasOpt) {
      if (level === 1) this.set(level, Number(select.options[0].value));
      if (level === 2) this.set(level, null, Number(select.options[0].value));
    }
  }
}


async function dashboard_models({
  sprint,
  disease = "dengue",
  adm_level,
  adm_1 = null,
  adm_2 = null,
  tags = selectedTags
}) {
  const params = new URLSearchParams();

  params.append("sprint", sprint);
  params.append("disease", disease);
  params.append("adm_level", adm_level);

  if (adm_1) params.append("adm_1", adm_1);
  if (adm_2) params.append("adm_2", adm_2);
  if (tags.length > 0) tags.forEach(t => params.append("tags", t));

  try {
    const res = await fetch(`/api/vis/dashboard/models/?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const models = await res.json();
    return models
  } catch (err) {
    console.error("/api/vis/dashboard/models/ error:", err);
  }
}


async function dashboard_predictions({
  sprint,
  disease = "dengue",
  adm_level,
  adm_1 = null,
  adm_2 = null,
  tags = [],
  models = [],
}) {
  const params = new URLSearchParams();

  params.append("sprint", sprint);
  params.append("disease", disease);

  if (adm_level) params.append("adm_level", adm_level);
  if (adm_1) params.append("adm_1", adm_1);
  if (adm_2) params.append("adm_2", adm_2);
  if (tags.length > 0) tags.forEach(t => params.append("tags", t));
  if (models.length > 0) models.forEach(m => params.append("models", m));

  try {
    const res = await fetch(`/api/vis/dashboard/predictions/?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const predictions = await res.json();
    return predictions;
  } catch (err) {
    console.error("/api/vis/dashboard/predictions/ error:", err);
  }
}


async function populatePredictions(params = {}, onChange) {
  const container = document.querySelector("#predictions-card .card-body");
  if (!container) {
    console.error("Missing #predictions-card .card-body element");
    return;
  }

  container.innerHTML = `<div class="text-muted">Loading predictions...</div>`;

  try {
    let predictions = (await dashboard_predictions(params)) || [];

    container._predictions = predictions;

    if (!predictions.length) {
      container.innerHTML = `<div class="text-muted">No predictions found.</div>`;
      if (typeof onChange === "function") onChange([]);
      return;
    }

    const getScore = (p, name) => (p.scores || []).find(s => s.name === name)?.score ?? null;
    const scoreName = Storage.score || "mae";
    const selectedIdsSet = new Set(Storage.prediction_ids || []);

    container.innerHTML = `
      <div id="predictions-table-wrapper">
        <table id="predictions-list" class="table table-sm table-hover align-middle"></table>
      </div>
      <div class="card-footer clearfix">
        <div class="row">
          <div class="col">
            <button id="predictions-clear-all" type="button" class="btn btn-tool">Clear</button>
          </div>
          <div class="col">
            <ul id="predictions-pagination" class="pagination pagination-sm m-0 float-right"></ul>
          </div>
        </div>
      </div>
    `;

    const $plist = $("#predictions-list");
    $plist.data("sort_by", $plist.data("sort_by") || "score");
    $plist.data("sort_direction", $plist.data("sort_direction") || "asc");

    function renderPage(pageData) {
      const header = `
        <thead>
          <tr>
            <th style="width: 20px;">
              <input type="checkbox" id="select-all-checkbox">
            </th>
            <th style="width: 50px;" class="sortable" data-sort="id">ID <span class="sort-arrow"></span></th>
            <th style="width: 55px;" class="sortable" data-sort="model">Model <span class="sort-arrow"></span></th>
            <th style="width: 80px;" class="sortable" data-sort="author">Author <span class="sort-arrow"></span></th>
            <th style="width: 50px;" class="sortable" data-sort="year">Year <span class="sort-arrow"></span></th>
            <th style="width: 80px;" class="sortable" data-sort="start_date">Start Date <span class="sort-arrow"></span></th>
            <th style="width: 80px;" class="sortable" data-sort="end_date">End Date <span class="sort-arrow"></span></th>
            <th style="width: 150px;">
              <div class="row">
                <div class="col sortable" data-sort="score">Score <span class="sort-arrow"></span></div>
                <div class="col">
                  <div class="row align-items-center" style="flex-flow: row-reverse;">
                    <div class="col-auto">
                      <i class="fas fa-question-circle text-muted" data-bs-toggle="modal" data-bs-target="#scoresModal" title="More info"></i>
                    </div>
                    <div class="col-auto">
                      <select id="scores" title="Score" class="form-select form-select-sm w-auto" style="width: 100px !important;">
                        <option value="mae" ${scoreName === "mae" ? "selected" : ""}>MAE</option>
                        <option value="mse" ${scoreName === "mse" ? "selected" : ""}>MSE</option>
                        <option value="crps" ${scoreName === "crps" ? "selected" : ""}>CRPS</option>
                        <option value="log_score" ${scoreName === "log_score" ? "selected" : ""}>Log Score</option>
                        <option value="interval_score" ${scoreName === "interval_score" ? "selected" : ""}>Interval Score</option>
                        <option value="wis" ${scoreName === "wis" ? "selected" : ""}>WIS</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </th>
          </tr>
        </thead>
      `;

      const rows = pageData.map(p => {
        const isChecked = selectedIdsSet.has(p.id);
        const scoreVal = getScore(p, Storage.score || "mae");
        const rowGradient = p.color ? `--gradient-start: ${hexToRgba(p.color, 0.25)};` : "";
        const cellColor = isChecked && p.color ? `background-color: ${hexToRgba(p.color, 1)};` : "";
        if (isChecked) updateLineChartPredictions("add", p.id);

        return `
          <tr data-widget="expandable-table"
              aria-expanded="false"
              class="prediction-row ${isChecked ? "selected" : ""}"
              data-id="${p.id}"
              style="${rowGradient}">
            <td id="td-${p.id}" class="${isChecked ? "selected" : ""}" style="${cellColor}">
              <input type="checkbox" class="checkbox-prediction" value="${p.id}" ${isChecked ? "checked" : ""}>
            </td>
            <td><a href="/registry/prediction/${p.id}/" target="_blank">${p.id}</a></td>
            <td><a href="/registry/model/${p.model}/" target="_blank">${p.model}</a></td>
            <td style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px">${p.author}</td>
            <td>${p.year}</td>
            <td>${p.start}</td>
            <td>${p.end}</td>
            <td>${scoreVal !== null ? scoreVal : "-"}</td>
          </tr>
        `;
      }).join("");

      $("#predictions-list").html(`${header}<tbody>${rows}</tbody>`);

      $("#scores").val(Storage.score);

      $("#scores").off("change").on("change", function() {
        Storage.score = $(this).val();
        applySortAndUpdate($plist.data("sort_by"), $plist.data("sort_direction"));
      });

      const by = $plist.data("sort_by");
      const dir = $plist.data("sort_direction");
      $(`#predictions-list .sortable .sort-arrow`).text("");
      $(`#predictions-list .sortable[data-sort="${by}"] .sort-arrow`).text(dir === "asc" ? "▲" : "▼");

      $("#predictions-list .sortable").off("click").on("click", function() {
        const byCol = $(this).data("sort");
        const currentBy = $plist.data("sort_by");
        const currentDir = $plist.data("sort_direction");
        let newDir = "asc";
        if (currentBy === byCol && currentDir === "asc") newDir = "desc";
        $plist.data("sort_by", byCol);
        $plist.data("sort_direction", newDir);
        applySortAndUpdate(byCol, newDir);
      });

      $(".checkbox-prediction").each(function() {
        const prediction_id = parseInt($(this).val(), 10);
        const td = $(`#td-${prediction_id}`);
        const checkbox = $(this);

        checkbox.prop("checked", Storage.prediction_ids && Storage.prediction_ids.includes(prediction_id));

        td.off('click').on('click', function(e) {
          if ($(e.target).is('input[type="checkbox"]')) return;
          e.stopPropagation();

          const isChecked = selectedIdsSet.has(prediction_id);

          if (isChecked) {
            selectedIdsSet.delete(prediction_id);
            td.removeClass('selected').css("background-color", "");
            updateLineChartPredictions("remove", prediction_id);
          } else {
            selectedIdsSet.add(prediction_id);
            td.addClass('selected');
            updateLineChartPredictions("add", prediction_id);
          }

          Storage.prediction_ids = Array.from(selectedIdsSet);

          applySortAndUpdate($plist.data("sort_by"), $plist.data("sort_direction"));

          if (typeof onChange === "function") onChange(Storage.prediction_ids || []);
        });
      });

      $(".checkbox-prediction").off("click").on("click", function(event) {
        event.stopPropagation();
        const prediction_id = parseInt(event.target.value, 10);
        const checked = $(event.target).prop("checked");
        if (checked) {
          Storage.prediction_ids = Array.from(new Set([...(Storage.prediction_ids || []), prediction_id]));
          selectedIdsSet.add(prediction_id);
          updateLineChartPredictions("add", prediction_id);
        } else {
          Storage.prediction_ids = (Storage.prediction_ids || []).filter(id => id !== prediction_id);
          selectedIdsSet.delete(prediction_id);
          updateLineChartPredictions("remove", prediction_id);
        }

        applySortAndUpdate($plist.data("sort_by"), $plist.data("sort_direction"));
        if (typeof onChange === "function") onChange(Storage.prediction_ids || []);
      });

      $("#select-all-checkbox").off("click").on("click", function() {
        const checked = $(this).prop("checked");
        $(".checkbox-prediction").prop("checked", checked).each(function() {
          const prediction_id = parseInt($(this).val(), 10);
          if (checked) {
            if (!Storage.prediction_ids) Storage.prediction_ids = [];
            if (!Storage.prediction_ids.includes(prediction_id)) Storage.prediction_ids.push(prediction_id);
            selectedIdsSet.add(prediction_id);
            $(`#td-${prediction_id}`).addClass('selected');
            updateLineChartPredictions("add", prediction_id);
          } else {
            Storage.prediction_ids = (Storage.prediction_ids || []).filter(id => id !== prediction_id);
            selectedIdsSet.delete(prediction_id);
            $(`#td-${prediction_id}`).removeClass('selected').css("background-color", "");
            updateLineChartPredictions("remove", prediction_id);
          }
        });

        applySortAndUpdate($plist.data("sort_by"), $plist.data("sort_direction"));
        if (typeof onChange === "function") onChange(Storage.prediction_ids || []);
      });

      $("#select-all-checkbox").prop("checked", $(".checkbox-prediction").length === $(".checkbox-prediction:checked").length);

      $("#predictions-clear-all").off("click").on("click", function() {
        selectedIdsSet.clear();
        Storage.prediction_ids = [];
        d.lineChart.clearPredictions();
        applySortAndUpdate($plist.data("sort_by"), $plist.data("sort_direction"));
      });
    }

    function applySortAndUpdate(byCol, dir) {
      const arr = container._predictions;

      arr.sort((a, b) => {
        const aSel = selectedIdsSet.has(a.id);
        const bSel = selectedIdsSet.has(b.id);
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;

        let aVal, bVal;
        if (byCol !== "score") {
          const keyMap = { "start_date": "start", "end_date": "end" };
          const k = keyMap[byCol] || byCol;
          aVal = a[k];
          bVal = b[k];
        } else {
          aVal = getScore(a, Storage.score || "mae");
          bVal = getScore(b, Storage.score || "mae");
          aVal = (aVal === null || aVal === undefined) ? Infinity : aVal;
          bVal = (bVal === null || bVal === undefined) ? Infinity : bVal;
        }

        if (aVal < bVal) return dir === "asc" ? -1 : 1;
        if (aVal > bVal) return dir === "asc" ? 1 : -1;
        return 0;
      });

      $('#predictions-pagination').pagination({
        dataSource: arr,
        pageSize: 10,
        callback: function(data) {
          renderPage(data);
        }
      });
    }

    applySortAndUpdate($plist.data("sort_by"), $plist.data("sort_direction"));

    if (typeof onChange === "function") onChange(Storage.prediction_ids || []);

  } catch (err) {
    console.error("populatePredictions error:", err);
    container.innerHTML = `<div class="text-danger">Error loading predictions</div>`;
  }
}

async function dashboard_line_chart_prediction({
  id,
  sprint,
  disease = "dengue",
  adm_level,
  adm_1 = null,
  adm_2 = null,
}) {
  const params = new URLSearchParams();

  params.append("id", id);
  params.append("sprint", sprint);
  params.append("disease", disease);
  params.append("adm_level", adm_level);
  if (adm_1) params.append("adm_1", adm_1);
  if (adm_2) params.append("adm_2", adm_2);

  try {
    const res = await fetch(`/api/vis/dashboard/line-chart/prediction/?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const { id: predId, color, data, start, end } = await res.json();

    return {
      id: predId,
      color,
      chart: {
        labels: data.map(d => d.date),
        data: data.map(d => d.pred),
        lower_50: data.map(d => d.lower_50),
        lower_80: data.map(d => d.lower_80),
        lower_90: data.map(d => d.lower_90),
        lower_95: data.map(d => d.lower_95),
        upper_50: data.map(d => d.upper_50),
        upper_80: data.map(d => d.upper_80),
        upper_90: data.map(d => d.upper_90),
        upper_95: data.map(d => d.upper_95),
      },
      start: start,
      end: end,
    };
  } catch (err) {
    console.error("/api/vis/dashboard/line-chart/prediction/ error:", err);
    return {
      id: null,
      color: null,
      chart: { labels: [], data: [] },
      bounds: {},
    };
  }
}

async function dashboard_line_chart_cases({
  sprint,
  disease = "dengue",
  adm_level,
  adm_1 = null,
  adm_2 = null,
}) {
  const params = new URLSearchParams();

  params.append("sprint", sprint);
  params.append("disease", disease);
  params.append("adm_level", adm_level);

  if (adm_1) params.append("adm_1", adm_1);
  if (adm_2) params.append("adm_2", adm_2);

  try {
    const res = await fetch(`/api/vis/dashboard/line-chart/cases/?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const labels = data.labels;
    const cases = data.cases;
    return { labels, cases };
  } catch (err) {
    console.error("/api/vis/dashboard/line-chart/ error:", err);
    return { labels: [], cases: [] };
  }
}

async function dashboard_tags({
  sprint,
  disease = "dengue",
  adm_level,
  adm_1 = null,
  adm_2 = null,
}) {
  const params = new URLSearchParams();
  params.append("sprint", sprint);
  params.append("disease", disease);
  params.append("adm_level", adm_level);
  if (adm_1) params.append("adm_1", adm_1);
  if (adm_2) params.append("adm_2", adm_2);

  try {
    const res = await fetch(`/api/vis/dashboard/tags/?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("/vis/dashboard/tags/ error:", err);
    return [];
  }
}

let selectedTags = new Set();
let selectedModels = new Set();

async function populateTags(params, onChange) {
  const tags = await dashboard_tags(params);
  const container = document.getElementById("tags-list");
  container.innerHTML = "";

  const selectedTags = new Set();

  async function updateModelsAndPredictions() {
    await populateModels({
      sprint: Storage.current.dashboard.dashboard === "sprint",
      disease: Storage.disease,
      adm_level: Storage.adm_level,
      adm_1: Storage.adm_1,
      adm_2: Storage.adm_2,
      tags: Array.from(selectedTags),
    }, async (selectedModels) => {
      await populatePredictions({
        sprint: Storage.current.dashboard.dashboard === "sprint",
        disease: Storage.disease,
        adm_level: Storage.adm_level,
        adm_1: Storage.adm_1,
        adm_2: Storage.adm_2,
        tags: Array.from(selectedTags),
        models: Array.from(selectedModels),
      }, (selectedPredictionIds) => {
        // if (d && d.lineChart) {
        //   d.lineChart.updatePredictions(selectedPredictionIds, { reset: false });
        // }
      });
    });
  }

  tags.models.forEach(tag => {
    const div = document.createElement("div");
    div.className = "tag-balloon";
    div.dataset.tagId = tag.id;
    div.textContent = tag.name;

    div.style = `
      display: inline-block;
      margin: 0.25rem;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      background-color: #f4f4f4;
      color: #333;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.3s ease;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;

    div.addEventListener("click", async () => {
      const tagId = parseInt(div.dataset.tagId);
      if (selectedTags.has(tagId)) {
        selectedTags.delete(tagId);
        div.style.backgroundColor = "#f4f4f4";
        div.style.color = "#333";
      } else {
        selectedTags.add(tagId);
        div.style.backgroundColor = "#007bff";
        div.style.color = "#fff";
      }

      await updateModelsAndPredictions();

      if (typeof onChange === "function") {
        onChange(Array.from(selectedTags));
      }
    });

    container.appendChild(div);
  });

  await updateModelsAndPredictions();

  if (typeof onChange === "function") {
    onChange(Array.from(selectedTags));
  }
}

async function populateModels(params, onChange) {
  const models = await dashboard_models(params);
  const container = document.querySelector("#models-card .card-body");
  if (!container) return;
  container.innerHTML = "";

  selectedModels.clear();

  const render = (list) => {
    container.innerHTML = "";
    list.forEach(model => {
      const div = document.createElement("div");
      div.className = "model-balloon";
      div.dataset.id = model.id;
      div.style = `
        display: inline-block;
        margin: 0.25rem;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        background-color: #f4f4f4;
        color: #333;
        font-size: 0.85rem;
        cursor: pointer;
        transition: background 0.3s ease;
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;

      div.innerHTML = `
        <a href="/registry/model/${model.id}/" target="_blank">${model.id}</a> ${model.name}
      `;

      div.addEventListener("click", (e) => {
        if (e.target.tagName.toLowerCase() === "a") return;
        const id = model.id;
        const isSelected = selectedModels.has(id);
        if (isSelected) {
          selectedModels.delete(id);
          div.style.backgroundColor = "#f4f4f4";
        } else {
          selectedModels.add(id);
          div.style.backgroundColor = "#eef";
        }
        if (typeof onChange === "function") {
          onChange(Array.from(selectedModels));
        }
      });

      container.appendChild(div);
    });
  };

  render(models);

  const searchInput = document.querySelector('#search input[name="models-search"]');
  if (searchInput) {
    const onSearch = debounce((query) => {
      const filtered = models.filter(m =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        String(m.id).toLowerCase().includes(query.toLowerCase()) ||
        m.author.toLowerCase().includes(query.toLowerCase())
      );
      render(filtered);
    }, 100);
    searchInput.addEventListener('input', (e) => onSearch(e.target.value));
  }

  if (typeof onChange === "function") {
    onChange(Array.from(selectedModels));
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

async function updateLineChartPredictions(action = "refresh", targetId = null) {
  const ids = Storage.prediction_ids || [];

  if (action === "remove" && targetId) {
    d.lineChart.removePrediction(targetId);
    return;
  }

  if (action === "add" && targetId) {
    try {
      const predData = await dashboard_line_chart_prediction({
        id: targetId,
        sprint: Storage.current.dashboard.dashboard === "sprint",
        disease: Storage.disease,
        adm_level: Storage.adm_level,
        adm_1: Storage.adm_1,
        adm_2: Storage.adm_2,
      });

      if (predData?.chart?.labels?.length) {
        d.lineChart.addPrediction(predData);
      }
    } catch (err) {
      console.error(`Failed to load prediction ${targetId}`, err);
    }
    return;
  }

  if (action === "refresh") {
    d.lineChart.clearPredictions();

    for (const id of ids) {
      try {
        const predData = await dashboard_line_chart_prediction({
          id,
          sprint: Storage.current.dashboard.dashboard === "sprint",
          disease: Storage.disease,
          adm_level: Storage.adm_level,
          adm_1: Storage.adm_1,
          adm_2: Storage.adm_2,
        });

        if (predData?.chart?.labels?.length) {
          d.lineChart.addPrediction(predData);
        }
      } catch (err) {
        console.error(`Failed to load prediction ${id}`, err);
      }
    }
  }
}
