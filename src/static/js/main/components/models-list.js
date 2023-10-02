function handleEditModel(modelId) {
  const cardElement = document.querySelector('.list-group');
  cardElement.style.display = 'block';

  fetchModelData(modelId);
}

async function fetchModelData(modelId) {
  const apiUrl = `/api/registry/models/${modelId}`;
  const editModelLabel = document.getElementById('edit-model-label');
  const editModelId = document.getElementById('edit-model-id');
  const editModelName = document.getElementById('edit-model-name');
  const editModelDesc = document.getElementById('edit-model-desc');
  const editModelRepo = document.getElementById('edit-model-repo');
  const editModelLang = document.getElementById('edit-model-lang');
  const editModelType = document.getElementById('edit-model-type');

  return fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
        editModelLabel.textContent = "Edit Model #" + data.id;
        editModelId.value = data.id;
        editModelName.value = data.name;
        editModelDesc.value = data.description;
        editModelRepo.value = data.repository;
        editModelLang.value = data.implementation_language.language;
        editModelType.value = data.type;

        handleDeleteModel(data.id);
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

function handleDeleteModel(modelId) {
    const deleteModelId = document.getElementById('delete-model-id');
    const deleteModelIdLabel = document.getElementById('delete-model-label');

    deleteModelId.value = modelId;
    deleteModelIdLabel.innerText = `Delete model #${modelId}?`;
}
