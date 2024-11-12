async function fetchURL(urlPath) {
  const url = new URL(urlPath, window.location.origin);

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data || {};
  } catch (error) {
    console.error(`fetchURL (${urlPath}):`, error.message);
    return {};
  }
}

async function fetchPredictions(dashboard) {
  return fetchURL(`/vis/get-predictions/?dashboard=${dashboard}`);
}

async function handleSelectedPredictions(dashboard, predictionIds) {
  const data = await fetchURL(`/vis/get-prediction-ids-specs/?ids=${predictionIds.join(',')}`);
  let storage = JSON.parse(localStorage.getItem('dashboards'))[dashboard];
  if (data && Object.keys(data).length > 0) {
    Object.keys(storage).forEach(key => {
      storage[key] = data[key];
    });
    localStorage.setItem('dashboards', JSON.stringify(storage));
  }
  console.log(storage["prediction_ids"]);
  return storage["prediction_ids"];
}

function filterBy(predictions, filters) {
  return predictions.filter(prediction => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      if (key === 'start_window_date') return new Date(prediction.start_window_date) >= new Date(value);
      if (key === 'end_window_date') return new Date(prediction.end_window_date) <= new Date(value);
      return prediction[key] === value;
    });
  });
}
