let d;
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
    tags,
    updated,
  ) {
    this.id = id;
    this.name = name;
    this.author = author;
    this.description = description;
    this.disease = disease;
    this.time_resolution = time_resolution;
    this.tags = tags;
    this.updated = updated;
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

    this.storage = new Storage(this);
    this.lineChart = new LineChart('chart');
    this.modelList = new ModelList(this);
    this.predictionList = new PredictionList(this);
    this.tagList = new TagList(this);

    this.fetch().then(models => {
      this.models = models;
      this.modelList.loading(false);
      this.modelList.list(models);
      this.storage.get("model_ids").forEach(id => this.modelList.select(id));
    });



    $(`#date-picker`).dateRangeSlider({
      bounds: {
        min: new Date(min_window_date),
        max: new Date(max_window_date),
      },
      defaultValues: {
        min: new Date(self.storage.get("start_window_date")),
        max: new Date(self.storage.get("end_window_date")),
      },
      range: {
        min: { days: 90 },
      },
    });

    $(`#date-picker`).bind("valuesChanged", function(e, data) {
      self.storage.set("start_window_date", data.values.min.toISOString().split('T')[0]);
      self.storage.set("end_window_date", data.values.max.toISOString().split('T')[0]);

      const adm_level = self.tagList.get_adm_level();
      const params = {
        disease: self.tagList.get_disease(),
        time_resolution: self.tagList.get_time_resolution(),
        adm_level: adm_level,
      };

      if (adm_level === 1) {
        params["adm_1"] = self.storage.get("adm_1");
      } else if (adm_level === 2) {
        params["adm_2"] = self.storage.get("adm_2");
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
        model.tags,
        model.updated
      )
      );
    }
    return [];
  }

  async update_casos({ disease, time_resolution, adm_level, adm_1, adm_2 }) {
    console.log(disease)
    console.log(time_resolution)
    console.log(adm_level)
    console.log(adm_1)
    console.log(adm_2)
    if (
      !disease ||
      !time_resolution ||
      !adm_level ||
      (adm_level == 1 && !adm_1) ||
      (adm_level == 2 && !adm_2)
    ) {
      this.lineChart.clear();
      console.log("asdjahskjsdhak")
      return;
    }

    const url_params = new URLSearchParams();
    url_params.append('dashboard', this.dashboard);
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

      const startDate = new Date(this.storage.get("start_window_date"));
      const endDate = new Date(this.storage.get("end_window_date"));

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

  /**
  * @param {Number} adm_level
  * 0, 1, 2 or 3
  */
  set_adm_level(adm_level) {
    if (!adm_level) {
      $("#adm-select-card").slideUp();
    } else {
      $("#adm-select-card").slideDown();
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
}


class Storage {
  /**
   * @param {Dashboard} dashboard
   */
  constructor(dashboard) {
    this.dashboard = dashboard;
    let d = dashboard.dashboard;

    let data = localStorage.getItem("dashboards");
    if (!data) { data = {} } else { data = JSON.parse(data) };
    if (!data[d]) {
      data[d] = {
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
    data[d].prediction_ids = data[d].prediction_ids || [];
    if (model_id) {
      data[d].model_ids = [model_id];
    } else {
      data[d].model_ids = data[d].model_ids || [];
    }
    data[d].tag_ids = data[d].tag_ids || [];
    if (!data[d].start_window_date) {
      data[d].start_window_date = min_window_date;
    }
    if (!data[d].end_window_date) {
      data[d].end_window_date = max_window_date;
    }
    data[d].adm_1 = data[d].adm_1 || null;
    data[d].adm_2 = data[d].adm_2 || null;
    data[d].score = data[d].score || "mae";
    localStorage.setItem("dashboards", JSON.stringify(data));
  }

  get(param) {
    const data = JSON.parse(localStorage.getItem("dashboards"));
    return data[this.dashboard.dashboard][param];
  }

  set(param, value) {
    let data = JSON.parse(localStorage.getItem("dashboards"));
    data[this.dashboard.dashboard][param] = value;
    localStorage.setItem("dashboards", JSON.stringify(data));
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
}


class PredictionList {
  /**
   * @param {Dashboard} dashboard
   */
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.predictions = [];
    this.predictions_map = {};
    this.update(this.dashboard.storage.get("model_ids"));
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

    const model_ids = this.dashboard.storage.get("model_ids");

    if (model_ids.length === 0) {
      this.dashboard.lineChart.clear();
      this.clear();
      this.list([]);
      $(`#predictions-card .overlay`).remove();
      return;
    }

    const url = new URL('/vis/get-predictions/', window.location.origin);
    model_ids.forEach(id => url.searchParams.append('model_id', id))

    const response = await fetch(url);
    if (response.ok) {
      const res = await response.json();
      this.list(res['items']);
      $(`#predictions-card .overlay`).remove();
    }
  }

  li(prediction) {
    const selected = this.dashboard.storage.get("prediction_ids").includes(prediction.id);

    return `
    <tr data-widget="expandable-table" aria-expanded="false" class="prediction-row" data-id="${prediction.id}">
      <td style="width: 40px;" class="${selected ? 'selected' : ''}" id="td-${prediction.id}">
        <input type="checkbox" value="${prediction.id}" id="checkbox-${prediction.id}" class="checkbox-prediction">
      </td>
      <td style="width: 40px;">${prediction.id}</td>
      <td style="width: 40px;"><a href="/registry/model/${prediction.model}/">${prediction.model}</a></td>
      <td style="width: 110px;">${prediction.start_date}</td>
      <td style="width: 110px;">${prediction.end_date}</td>
      <td style="width: 150px;">${prediction.scores[this.dashboard.storage.get("score")] || "-"}</td>
    </tr>
    <tr class="expandable-body d-none"><td colspan="6"><p>${prediction.description}</p></td></tr>
  `;
  }

  list(predictions) {
    if (predictions.length === 0) {
      this.dashboard.set_adm_level(null);
      this.dashboard.storage.set("adm_1", null);
      this.dashboard.storage.set("adm_2", null);
      this.paginate([]);
      return
    }

    predictions = [...predictions].sort((a, b) => {
      const aScore = a.scores[this.dashboard.storage.get("score")] ?? Infinity;
      const bScore = b.scores[this.dashboard.storage.get("score")] ?? Infinity;
      return aScore - bScore;
    });

    const self = this;
    const isAdm2 = predictions.some(prediction => prediction.adm_2 !== null);

    this.dashboard.storage.get("prediction_ids").forEach(id => {
      if (!predictions.some(prediction => prediction.id === id)) {
        self.unselect(id)
      }
    })

    if (!isAdm2) {
      const adm1List = this.extract_adm1(predictions);
      if (
        !this.dashboard.storage.get("adm_1") ||
        !adm1List.some(([value, _]) => value === this.dashboard.storage.get("adm_1"))
      ) {
        this.dashboard.storage.set("adm_1", adm1List[0][0]);
      }

      $('#adm1-filter').empty();

      adm1List.forEach(([value, text]) => {
        const isSelected = value === this.dashboard.storage.get("adm_1");
        $('#adm1-filter').append($('<option>', {
          value: value,
          text: text,
          selected: isSelected
        }));
      });

      self.paginate(self.filter(predictions, 1, this.dashboard.storage.get("adm_1")))

      $("#adm1-filter").on("change", function() {
        self.clear()
        self.dashboard.lineChart.clearPredictions();
        self.paginate(self.filter(predictions, 1, $(this).val()));
      });
    } else {
      const adm1List = this.extract_adm1(predictions);

      let adm1 = this.dashboard.storage.get("adm_1");
      let adm2 = this.dashboard.storage.get("adm_2");
      if (!adm2 || !adm1List.some(([code]) => String(adm2).startsWith(String(code)))) {
        if (!adm1 || !adm1List.some(([code]) => code === adm1)) {
          adm1 = adm1List[0][0];
          const adm2List = this.extract_adm2(predictions, adm1);
          const adm2 = adm2List.find(([geocode, name]) => String(geocode).startsWith(String(adm1)));
          this.dashboard.storage.set("adm_1", adm1);
          this.dashboard.storage.set("adm_2", adm2[0]);
        } else {
          const adm2List = this.extract_adm2(predictions, adm1);
          adm2 = adm2List.find(([geocode, name]) => String(geocode).startsWith(String(adm1)));
          this.dashboard.storage.set("adm_2", adm2[0]);
        }
      } else {
        this.dashboard.storage.set("adm_1", parseInt(String(this.dashboard.storage.get("adm_2")).slice(0, 2), 10));
      }

      this.paginate(this.filter(predictions, 2, this.dashboard.storage.get("adm_2")));
      const adm2List = this.extract_adm2(predictions, this.dashboard.storage.get("adm_1"));

      $('#adm1-filter').empty();
      adm1List.forEach(([code, name]) => {
        const isSelected = code === this.dashboard.storage.get("adm_1");
        $('#adm1-filter').append($('<option>', {
          value: code,
          text: name,
          selected: isSelected
        }));
      });

      $('#adm2-filter').empty();
      adm2List.forEach(([geocode, name]) => {
        const isSelected = geocode === this.dashboard.storage.get("adm_2");
        $('#adm2-filter').append($('<option>', {
          value: geocode,
          text: name,
          selected: isSelected
        }));
      });

      $("#adm1-filter").off("change").on("change", function() {
        self.dashboard.lineChart.clearPredictions();
        self.clear()

        const adm2List = self.extract_adm2(predictions, $(this).val());

        let adm2 = self.dashboard.storage.get("adm_2");
        if (!adm2 || !adm2List.some(([geocode]) => geocode === adm2) || !String(adm2).startsWith(String($(this).val()))) {
          adm2 = adm2List[0][0]
          self.dashboard.storage.set("adm_2", adm2);
        }

        $('#adm2-filter').empty();
        adm2List.forEach(([geocode, name]) => {
          const isSelected = geocode === self.dashboard.storage.get("adm_2");
          $('#adm2-filter').append($('<option>', {
            value: geocode,
            text: name,
            selected: isSelected
          }));
        });

        self.paginate(self.filter(predictions, 2, self.dashboard.storage.get("adm_2")));
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
    params[`adm_${adm_level}`] = adm;

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
        const body = data.map((item) => self.li(item)).join("");
        const score = self.dashboard.storage.get("score");
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
          if (self.dashboard.storage.get("prediction_ids").includes(prediction_id)) {
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
    location.reload();
  }

  select(prediction) {
    let prediction_ids = new Set(this.dashboard.storage.get("prediction_ids"));

    prediction_ids.add(prediction.id);
    this.dashboard.lineChart.addPrediction({
      id: prediction.id,
      labels: prediction.chart.labels,
      data: prediction.chart.data,
      upper_50: prediction.chart.upper_50,
      upper_90: prediction.chart.upper_90,
      lower_50: prediction.chart.lower_50,
      lower_90: prediction.chart.lower_90,
      color: prediction.color
    })
    this.dashboard.storage.set("prediction_ids", Array.from(prediction_ids));

    const td = $(`#td-${prediction.id}`);
    td.addClass('selected');
    td.css("background-color", prediction.color);
  }

  unselect(prediction_id) {
    let prediction_ids = new Set(this.dashboard.storage.get("prediction_ids"));
    prediction_ids.delete(prediction_id);
    this.dashboard.lineChart.removePrediction(prediction_id)
    this.dashboard.storage.set("prediction_ids", Array.from(prediction_ids));

    const td = $(`#td-${prediction_id}`);
    td.removeClass('selected');
    td.css("background-color", '');
    $(`.checkbox-prediction[value="${prediction_id}"]`).prop("checked", false);
    $("#select-all-checkbox").prop("checked", false);
  }

  clear() {
    this.dashboard.storage.get("prediction_ids").forEach(id => this.unselect(id));
  }
}


class TagList {
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
