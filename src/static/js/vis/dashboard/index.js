const colors = [
  "#A6BCD4", "#FAC28C", "#F2ABAB", "#B9DBD9", "#AAD1A5", "#F7E59D", "#D9BCD1", "#FFCED3", "#CEBAAE",
  "#B9A6D4", "#8CFAC2", "#ABF2D5", "#A6B9DB", "#A5D1AA", "#F7D99D", "#D9D1BC", "#D3FFCE", "#BACEAE",
  "#D4A6BC", "#8CFAE5", "#F2ABF1", "#DBB9A6", "#AACED1", "#9DF7A6", "#BCD9BC", "#FFCEB9", "#AECEBA",
  "#A6D4A6", "#8CFAAB", "#F2E5AB", "#D9A5BC", "#B9CEAA", "#F7E59A", "#D1A6D9", "#CEBACE", "#FFD9E5",
  "#A6D9F2", "#C28CFA", "#ABF2A6", "#A6DBB9", "#E59DAA", "#D1F7BC", "#BCBCD9", "#E5FFD3", "#A6B9CE",
  "#D4BCA6", "#FAF28C", "#ABF2E5", "#A6AADB", "#9DF7CE", "#D9A5D9", "#BCF7AA", "#FFCECD", "#BAAED3",
  "#D4A6D9", "#FAC28C", "#ABABF2", "#B9D9A6", "#AAD1D9", "#F7AB9D", "#D9BCF2", "#FFCED3", "#BAAACB",
  "#A6F2BC", "#C28CFA", "#ABF2C2", "#A6D9B9", "#E5F7AA", "#D1CBA6", "#BCD9BC", "#FFD3FF", "#A6CEBA",
  "#D4A6E5", "#FAC28C", "#ABF2A6", "#B9A6D9", "#E5D99D", "#D9AADD", "#CEBCD9", "#F7FFCE", "#AACBE5",
  "#A6D4A6", "#FAC2A6", "#E5D9A6", "#A6F7CE", "#D99DAB", "#B9F2BC", "#FFCEA6", "#A6D9CE", "#C2BCAF"
];


async function getBrowserCity() {
  let local = JSON.parse(localStorage.getItem('local')) || {};

  if (local) {
    return local;
  }

  try {
    const ipApi = await fetch('http://ip-api.com/json');
    const loc = await ipApi.json();

    if (loc.countryCode === 'BR') {
      const uf = loc.region;
      const city = loc.city;

      if (uf && city) {
        const cityInfoResponse = await fetch(`/vis/ibge/city/?name=${encodeURIComponent(city)}&uf=${encodeURIComponent(uf)}`);
        const cityInfo = await cityInfoResponse.json();

        if (cityInfo.geocode) {
          localStorage.setItem('local', JSON.stringify(cityInfo));
          return cityInfo;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching location:', error);
  }
  return null;
}

async function fetchURL(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data || {};
  } catch (error) {
    console.error(`fetchURL (${url.pathname}):`, error.message);
    return {};
  }
}

async function fetchPredictions(dashboard) {
  return fetchURL(`/vis/get-predictions/?dashboard=${dashboard}`);
}


async function handleSelectedPredictions(dashboard, predictionIds) {
  const url = new URL(`/vis/get-prediction-ids-specs/?ids=${predictionIds.join(',')}`, window.location.origin);
  const data = await fetchURL(url);
  let storage = JSON.parse(localStorage.getItem('dashboards'));
  if (data && Object.keys(data).length > 0) {
    Object.keys(storage[dashboard]).forEach(key => {
      storage[key] = data[key];
    });
    localStorage.setItem('dashboards', JSON.stringify(storage));
  }
  return storage["prediction_ids"];
}


async function loadData() {
  try {
    pageData.predictions = await fetchPredictions("predictions");
    pageData.sprint = await fetchPredictions("sprint");

    if (pageData.predictions && pageData.sprint) {
      ['predictions', 'sprint'].forEach(dashboard => {
        update(dashboard);
      });
    } else {
      throw new Error("Page data is incomplete.");
    }
  } catch (error) {
    console.error("Error loading data:", error);
    throw error;
  }
}


async function initializePage() {
  if (pageData.predictions && pageData.sprint) {
    ['predictions', 'sprint'].forEach(dashboard => {
      update(dashboard);
    })
  } else {
    setTimeout(initializePage, 1000);
  }
}


function filterBy(data, filters) {
  return data.filter(prediction => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      if (['score', 'adm_0', 'adm_3', 'prediction_ids'].includes(key)) return true;
      if (['start_window_date', 'end_window_date'].includes(key)) return true;
      if (key === 'adm_2' && prediction.adm_level === 1) return true;
      return String(prediction[key]) === String(value);
    });
  });
}


async function fetchPredictListData(predictionIds) {
  const url = new URL("/vis/get-predict-list-data/", window.location.origin);
  url.searchParams.append('prediction-ids', predictionIds.join(','));
  return fetchURL(url);
}

async function fetchPredictScores(predictionIds, startWindowDate, endWindowDate) {
  const url = new URL("/vis/get-prediction-scores/", window.location.origin);
  url.searchParams.append('prediction-ids', predictionIds.join(','));
  url.searchParams.append('start-window-date', startWindowDate);
  url.searchParams.append('end-window-date', endWindowDate);
  return fetchURL(url);
}


function renderHeader(dashboard, container) {
  const storage = JSON.parse(localStorage.getItem('dashboards'));
  const headerExists = container.querySelector('.header-item');
  if (headerExists) return;

  const headerLi = document.createElement('li');
  headerLi.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'balloon-item', 'header-item');

  const row = document.createElement('div');
  row.classList.add('row', 'w-100', 'align-items-center');

  const col1 = document.createElement('div');
  col1.classList.add('col-1', 'text-center');
  col1.style.whiteSpace = 'nowrap';
  col1.innerHTML = '<strong>Prediction ID</strong>';

  const col2 = document.createElement('div');
  col2.classList.add('col', 'text-center');
  col2.innerHTML = '<strong>Model</strong>';

  const col3 = document.createElement('div');
  col3.classList.add('col-auto', 'text-center');
  col3.innerHTML = '<strong>Prediction Date</strong>';

  const col4 = document.createElement('div');
  col4.classList.add('col-2', 'd-flex', 'align-items-center', 'justify-content-end', 'p-0', 'me-0');

  const btn = document.createElement('button');
  btn.classList.add('btn', 'dropdown-toggle', 'me-0');
  btn.type = 'button';
  btn.id = 'dropdownHeaderScore';
  btn.setAttribute('data-bs-toggle', 'dropdown');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = `<strong>${getScoreLabel(storage[dashboard].score)}</strong>`;

  const menu = document.createElement('ul');
  menu.classList.add('dropdown-menu');
  menu.setAttribute('aria-labelledby', 'dropdownHeaderScore');

  const scores = ['mse', 'mae', 'crps', 'log_score', 'interval_score'];
  scores.forEach(score => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.classList.add('dropdown-item');
    a.setAttribute('data-score', score);
    a.textContent = getScoreLabel(score);
    li.appendChild(a);
    menu.appendChild(li);
  });

  col4.appendChild(btn);
  col4.appendChild(menu);

  row.appendChild(col1);
  row.appendChild(col2);
  row.appendChild(col3);
  row.appendChild(col4);

  headerLi.appendChild(row);
  container.appendChild(headerLi);

  const scoreItems = menu.querySelectorAll('.dropdown-item');
  scoreItems.forEach(scoreItem => {
    scoreItem.addEventListener('click', function(event) {
      const selectedScore = event.target.getAttribute('data-score');

      storage[dashboard].score = selectedScore;
      localStorage.setItem('dashboards', JSON.stringify(storage));

      btn.innerHTML = `<strong>${getScoreLabel(selectedScore)}</strong>`;

      updateScores(dashboard, selectedScore);
    });
  });
}


function getScoreLabel(score) {
  switch (score) {
    case 'mse': return 'MSE';
    case 'mae': return 'MAE';
    case 'crps': return 'CRPS';
    case 'log_score': return 'Log Score';
    case 'interval_score': return 'Interval Score';
    default: return 'Select Score';
  }
}


function renderPredictionItems(dashboard, data, predictions) {
  const storage = JSON.parse(localStorage.getItem('dashboards'));
  const predictIdsContainer = document.getElementById(`predict-ids-${dashboard}`);
  const ul = document.createElement('ul');
  ul.classList.add('list-group');

  const storagePredictionIds = storage[dashboard]["prediction_ids"];
  const listIds = new Set();

  storage[dashboard]["prediction_ids"] = storagePredictionIds.filter(id => data.some(item => item.id === id));
  localStorage.setItem('dashboards', JSON.stringify(storage));

  let startWindowDate;
  let endWindowDate;

  data.forEach((item, index) => {
    const id = item.id;
    listIds.add(id);

    const model = predictions[id] ? predictions[id].model : null;
    const predict_date = predictions[id] ? predictions[id].predict_date : null;

    const li = document.createElement('li');
    const [model_id, model_name] = model ? model.split(' : ') : ["-", "Unknown"];
    li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'predict-item');
    li.id = id;

    const color = colors[index % colors.length];
    li.setAttribute('data-color', color);
    li.setAttribute('data-start-window-date', item.start_window_date);
    li.setAttribute('data-end-window-date', item.end_window_date);

    if (!startWindowDate || new Date(item.start_window_date) < new Date(startWindowDate)) {
      startWindowDate = item.start_window_date;
    }

    if (!endWindowDate || new Date(item.end_window_date) > new Date(endWindowDate)) {
      endWindowDate = item.end_window_date;
    }

    if (storagePredictionIds.includes(id)) {
      li.classList.add('active');
      li.style.backgroundColor = color;
      li.style.color = 'black';
    }

    li.innerHTML = `
      <div class="row w-100">
        <div class="col-1 text-center">${id}</div>
        <div class="col text-center" style="min-width: 200px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
          <a href="/registry/model/${model_id}" class="text-decoration-none" target="_blank">
            ${model_name} 
          </a>
        </div>
        <div class="col-auto text-center" style="min-width: 100px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${predict_date || "N/A"}</div>
        <div class="col-2 text-end" style="min-width: 80px;">
          <span class="badge bg-primary" id="score-${id}">loading</span>
        </div>
      </div>
    `;

    li.addEventListener('mouseover', function() {
      if (!li.classList.contains('active')) {
        li.style.backgroundColor = color;
      }
    });

    li.addEventListener('mouseout', function() {
      if (!li.classList.contains('active')) {
        li.style.backgroundColor = '';
      }
    });

    li.addEventListener('click', function() {
      const storage = JSON.parse(localStorage.getItem('dashboards'));
      const isActive = this.classList.toggle('active');

      if (isActive) {
        this.style.backgroundColor = color;
        this.style.color = 'black';
        if (!storagePredictionIds.includes(id)) {
          storagePredictionIds.push(id);
        }
      } else {
        this.style.backgroundColor = '';
        const index = storagePredictionIds.indexOf(id);
        if (index > -1) {
          storagePredictionIds.splice(index, 1);
        }
      }

      let activePreds = Array.from(ul.querySelectorAll('.predict-item.active'));

      if (activePreds.length === 0) {
        activePreds = Array.from(ul.querySelectorAll('.predict-item')).slice(0, 5)
      }

      let activeStartWindowDate = null;
      let activeEndWindowDate = null;

      activePreds.forEach(item => {
        const startDate = item.getAttribute('data-start-window-date');
        const endDate = item.getAttribute('data-end-window-date');

        if (!activeStartWindowDate || new Date(startDate) < new Date(activeStartWindowDate)) {
          activeStartWindowDate = startDate;
        }

        if (!activeEndWindowDate || new Date(endDate) > new Date(activeEndWindowDate)) {
          activeEndWindowDate = endDate;
        }
      });

      storage[dashboard]["prediction_ids"] = storagePredictionIds;
      storage[dashboard]["start_window_date"] = activeStartWindowDate;
      storage[dashboard]["end_window_date"] = activeEndWindowDate;
      localStorage.setItem('dashboards', JSON.stringify(storage));
      renderPredictsChart(dashboard);
    });

    ul.appendChild(li);
  });

  const activePreds = Array.from(ul.querySelectorAll('.list-group-item.active'));

  if (activePreds.length > 0) {
    startWindowDate = null;
    endWindowDate = null;

    activePreds.forEach(item => {
      const startDate = item.getAttribute('data-start-window-date');
      const endDate = item.getAttribute('data-end-window-date');

      if (!startWindowDate || new Date(startDate) < new Date(startWindowDate)) {
        startWindowDate = startDate;
      }

      if (!endWindowDate || new Date(endDate) > new Date(endWindowDate)) {
        endWindowDate = endDate;
      }
    });
  }

  storage[dashboard]["start_window_date"] = startWindowDate;
  storage[dashboard]["end_window_date"] = endWindowDate;
  storage[dashboard]["prediction_ids"] = storagePredictionIds.filter(id => listIds.has(id));
  localStorage.setItem('dashboards', JSON.stringify(storage));
  predictIdsContainer.appendChild(ul);
}


async function updateScores(dashboard, selectedScore) {
  if (dashboard === "forecast_map") {
    return
  }
  const storage = JSON.parse(localStorage.getItem('dashboards'));
  const ul = document.querySelector(`#predict-ids-${dashboard} .list-group`);
  const predictionIds = Array.from(ul.children)
    .filter(li => li && li.id && !li.classList.contains('header-item'))
    .map(li => li.id);

  const listItems = Array.from(ul.children).filter(li => li && !li.classList.contains('header-item'));

  listItems.forEach(li => {
    const id = li.id;
    const scoreElement = li.querySelector(`#score-${id}`);
    if (scoreElement) {
      scoreElement.textContent = "loading";
    }
  });

  try {
    const scores = await fetchPredictScores(
      predictionIds,
      storage[dashboard].start_window_date,
      storage[dashboard].end_window_date
    );

    listItems.forEach(li => {
      const id = li.id;
      const scoreElement = li.querySelector(`#score-${id}`);

      if (scores[id] && scores[id][selectedScore] !== null) {
        const scoreValue = scores[id][selectedScore];
        scoreElement.textContent = selectedScore === 'log_score'
          ? `-${scoreValue.toFixed(2)}`
          : scoreValue.toFixed(2);
        li.setAttribute('data-score', scoreValue);
      } else {
        scoreElement.textContent = "N/A";
        li.setAttribute('data-score', 'NaN');
      }
    });

    const sortedListItems = listItems.sort((a, b) => {
      const scoreA = parseFloat(a.getAttribute('data-score'));
      const scoreB = parseFloat(b.getAttribute('data-score'));

      if (isNaN(scoreA)) return 1;
      if (isNaN(scoreB)) return -1;
      return scoreA - scoreB;
    });

    sortedListItems.forEach(li => ul.appendChild(li));

  } catch (error) {
    console.error("Error fetching scores:", error);

    predictionIds.forEach(id => {
      const scoreElement = document.getElementById(`score-${id}`);
      if (scoreElement) {
        scoreElement.textContent = "error";
      }
    });
  }
}


async function renderPredictList(dashboard) {
  const storage = JSON.parse(localStorage.getItem('dashboards'));
  const data = filterBy(pageData[dashboard].predictions, storage[dashboard]);
  const predictionIds = data.map(item => item.id);
  const list = document.getElementById(`predict-ids-${dashboard}`)
  const predictionData = await fetchPredictListData(predictionIds);

  list.innerHTML = '';
  renderHeader(dashboard, list);

  if (predictionData) {
    const predictions = predictionData.data;
    renderPredictionItems(dashboard, data, predictions);
    updateScores(dashboard, storage[dashboard].score);
  } else {
    list.innerHTML = '<p>Error fetching predictions</p>';
  }
}


async function renderPredictsChart(dashboard) {
  if (dashboard === "forecast_map") {
    return {};
  }

  const data = JSON.parse(localStorage.getItem('dashboards'))[dashboard];
  const predictList = document.getElementById(`predict-ids-${dashboard}`);
  const loading = document.getElementById(`chart-loading-${dashboard}`);
  const chart = document.getElementById(`chart-container-${dashboard}`);
  const width = document.getElementById('dsContent').getBoundingClientRect().width - 200;
  const title = "New Cases";

  const colors = {};
  predictList.querySelectorAll('.predict-item').forEach(item => {
    const id = parseInt(item.id, 10);
    const color = item.getAttribute('data-color') || item.style.backgroundColor;
    colors[id] = color;
  });

  loading.style.display = 'flex';

  const query = {
    sprint: dashboard === "sprint",
    disease: data["disease"],
    time_resolution: data["time_resolution"],
    adm_level: data["adm_level"],
    adm_1: data["adm_1"],
    adm_2: data["adm_2"],
    start_window_date: data["start_window_date"],
    end_window_date: data["end_window_date"],
    prediction_ids: data["prediction_ids"],
    score: data["score"],
    width: width,
    title: title,
    colors: colors,
  };

  if (data["prediction_ids"].length === 0) {
    await fetchPredictScores(
      Array.from(predictList.querySelectorAll('.predict-item'))
        .slice(0, 5)
        .map(item => parseInt(item.id, 10)),
      data["start_window_date"],
      data["end_window_date"]
    );
    query["prediction_ids"] = Array.from(predictList.querySelectorAll('.predict-item'))
      .slice(0, 5)
      .map(item => parseInt(item.id, 10));
  }

  const cacheKey = JSON.stringify(query);

  const cachedChart = await db.charts.get(cacheKey);

  if (cachedChart) {
    const result = JSON.parse(cachedChart.data);
    await vegaEmbed(chart, result.chart);
    loading.style.display = 'none';
    return;
  }

  try {
    const response = await fetch('/vis/line-charts-predicts-chart/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });

    const result = await response.json();

    if (result.status === 'success') {
      await db.charts.put({ cacheKey: cacheKey, data: JSON.stringify(result) });
      await vegaEmbed(chart, result.chart);
      loading.style.display = 'none';
    }
  } catch (error) {
    console.error(error);
  }
}


async function extractStartEndWindowDate(dashboard) {
  const predictList = document.getElementById(`predict-ids-${dashboard}`);
  let minDate = null;
  let maxDate = null;

  predictList.querySelectorAll('.predict-item').forEach(item => {
    const startDate = new Date(item.getAttribute('data-start-window-date'));
    const endDate = new Date(item.getAttribute('data-end-window-date'));

    if (!isNaN(startDate) && (!minDate || startDate < minDate)) {
      minDate = startDate;
    }
    if (!isNaN(endDate) && (!maxDate || endDate > maxDate)) {
      maxDate = endDate;
    }
  });

  return [minDate, maxDate];
}


async function setDateWindowRange(dashboard) {
  const predictList = document.getElementById(`predict-ids-${dashboard}`);
  const [startDate, endDate] = await extractStartEndWindowDate(dashboard);
  const dateSlider = $(`#windowDatePicker-${dashboard}`);

  try {
    dateSlider.dateRangeSlider("destroy");
  } catch (error) {
    console.log(error);
  }

  dateSlider.dateRangeSlider({
    bounds: {
      min: new Date(startDate),
      max: new Date(endDate),
    },
    defaultValues: {
      min: new Date(startDate),
      max: new Date(endDate),
    },
    range: {
      min: { days: 90 },
    },
  });

  const predictDatesMap = new Map();

  predictList.querySelectorAll('.predict-item').forEach(item => {
    const predictId = item.getAttribute('id');
    const itemStartDate = new Date(item.getAttribute('data-start-window-date'));
    const itemEndDate = new Date(item.getAttribute('data-end-window-date'));
    predictDatesMap.set(predictId, { start: itemStartDate, end: itemEndDate });
  });

  dateSlider.bind("valuesChanging", function(e, data) {
    const rangeMin = data.values.min;
    const rangeMax = data.values.max;

    predictDatesMap.forEach((dates, predictId) => {
      const escapedId = CSS.escape(predictId);
      const item = predictList.querySelector(`#${escapedId}`);

      if (item) {
        if (dates.end >= rangeMin && dates.start <= rangeMax) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      } else {
        console.warn(`Element with ID ${predictId} not found within the predictList.`);
      }
    });
  });

  dateSlider.bind("valuesChanged", function(e, data) {
    const storage = JSON.parse(localStorage.getItem('dashboards'));
    const startDate = data.values.min;
    const endDate = data.values.max;

    storage[dashboard]["start_window_date"] = startDate.toISOString().split('T')[0];
    storage[dashboard]["end_window_date"] = endDate.toISOString().split('T')[0];
    localStorage.setItem('dashboards', JSON.stringify(storage));
    renderPredictsChart(dashboard);
    updateScores(dashboard, storage[dashboard].score);
  });
}
