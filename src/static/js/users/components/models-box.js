var table = new DataTable('#models-box', {
    responsive: true,
    pageLength: 3,
    lengthMenu: [3, 6, 12],
    order: [[6, 'desc']]
});
$('.dataTables_filter').addClass('search-box-container');
$('.dataTables_length').addClass('show-entries-container');
$('.dataTables_info').addClass('show-info');
$('.dataTables_paginate').addClass('pagination-container');

let selectedModelId = null;

function handleModelClick(modelId) {
  const cardElement = document.querySelector('.model-card');
  cardElement.style.display = 'block';

  fetchModelJSON(modelId);
  displayCurlCommand(modelId);
  displayPythonCode(modelId);

  selectedModelId = modelId;

  updatePredictionsLink();
}

function fetchModelJSON(modelId) {
  const apiUrl = `/api/registry/models/${modelId}`;

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      const resultContainer = document.getElementById('model-json');
      resultContainer.textContent = JSON.stringify(data, null, 4);
      hljs.highlightBlock(resultContainer);

      // TODO: isolate in its own function, using django query to get the model 
      const modelNameElement = document.getElementById('model-name');
      const modelDescriptionElement = document.getElementById('model-description');
      const modelRepositoryElement = document.getElementById('model-repository');
      const modelLanguageElement = document.getElementById('model-language');
      const modelTypeElement = document.getElementById('model-type');
      
      modelNameElement.textContent = data.name;
      modelDescriptionElement.textContent = data.description;
      modelLanguageElement.textContent = data.implementation_language;
      modelTypeElement.textContent = data.type;

      const repositoryLink = document.createElement('a');
      repositoryLink.href = data.repository;
      repositoryLink.textContent = data.repository;
      modelRepositoryElement.textContent = '';
      modelRepositoryElement.appendChild(repositoryLink);
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

function displayCurlCommand(modelId) {
  const apiUrl = `https://api.mosqlimate.com/api/registry/models/${modelId}`;
  const curlCommand = `curl -X "GET" ${apiUrl}`;
  const curlModelCommandElement = document.getElementById('curl-model-command');
  curlModelCommandElement.textContent = curlCommand;
  hljs.highlightBlock(curlModelCommandElement);
}

function displayPythonCode(modelId) {
  const pythonCode = `import requests\nrequests.get("https://api.mosqlimate.com/api/registry/models/${modelId}").json()`;
  const pythonTabContent = document.getElementById('python-model-code');
  pythonTabContent.innerHTML = pythonCode;
  hljs.highlightBlock(pythonTabContent);
}

function updatePredictionsLink() {
  const baseUrl = document.getElementById('predictions-url').dataset.baseUrl;
  const predictionsLink = document.getElementById('predictions-link');
  const modelUrlParameter = addModelUrl();
  const updatedUrl = `${baseUrl}${modelUrlParameter}`;
  predictionsLink.href = updatedUrl;
}

function addModelUrl() {
  if (selectedModelId) {
    return `?page=1&per_page=50&model_id=${selectedModelId}`;
  }
  return '';
}

function changeTab(event, tabName) {
  event.preventDefault();
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    link.classList.remove('active');
  });

  event.target.classList.add('active');
  const tabContents = document.querySelectorAll('.tab-content');

  tabContents.forEach(content => {
    if (content.id === `${tabName}-tab`) {
      content.style.display = 'block';
    } else {
      content.style.display = 'none';
    }
  });
}
