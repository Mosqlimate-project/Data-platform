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
  selectedModelId = modelId;

  fetchModelData()
    .then(modelData => {
      updateModelModal(modelData);
    });

  displayCurlCommand();
  displayPythonCode();

  updatePredictionsLink();
}

function fetchModelData() {
  const apiUrl = `/api/registry/models/${selectedModelId}`;

  return fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
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

      const resultContainer = document.getElementById('model-json');
      resultContainer.textContent = JSON.stringify(data, null, 4);
      hljs.highlightBlock(resultContainer);

      return data;
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

function displayCurlCommand() {
  const apiUrl = `https://api.mosqlimate.com/api/registry/models/${selectedModelId}`;
  const curlCommand = `curl -X "GET" ${apiUrl}`;
  const curlModelCommandElement = document.getElementById('curl-model-command');
  curlModelCommandElement.textContent = curlCommand;
  hljs.highlightBlock(curlModelCommandElement);
}

function displayPythonCode() {
  const pythonCode = `import requests\nrequests.get("https://api.mosqlimate.com/api/registry/models/${selectedModelId}").json()`;
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

function updateModelModal(modelData) {
  const updateModelLabel = document.getElementById('update-model-label');
  const updateModelId = document.getElementById('update-model-id');
  const updateModelName = document.getElementById('update-model-name');
  const updateModelDesc = document.getElementById('update-model-desc');
  const updateModelRepo = document.getElementById('update-model-repo');
  const updateModelLang = document.getElementById('update-model-lang');
  const updateModelType = document.getElementById('update-model-type');

  updateModelLabel.textContent = "Update Model #" + modelData.id;
  updateModelId.value = modelData.id;
  updateModelName.value = modelData.name;
  updateModelDesc.value = modelData.description;
  updateModelRepo.value = modelData.repository;
  updateModelLang.value = modelData.implementation_language;
  updateModelType.value = modelData.type;
}
