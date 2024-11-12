async function fetchURL(urlPath) {
  try {
    const url = new URL(urlPath, window.location.origin);
    const response = await fetch(url);
    const result = await response.json();
    return result || {};
  } catch (error) {
    console.error(`fetchURL (${urlPath}):`, error.message);
    return {};
  }
}

async function fetchPredictions(dashboard) {
  return await fetchURL(`/vis/get-predictions/?dashboard=${dashboard}`);
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
