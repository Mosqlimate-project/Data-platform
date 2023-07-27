function resetPageInput() {
  $("input[name='page']").val(1);
}

function clearInput(inputName) {
  var inputElement = document.querySelector(`input[name='${inputName}']`);
  if (inputElement) {
    inputElement.value = '';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const modelCollapse = document.getElementById('modelCollapse');
  const buttonIcon = document.querySelector('.btn-menu i');

  modelCollapse.addEventListener('show.bs.collapse', function() {
    buttonIcon.classList.remove('fa-arrow-down-short-wide');
    buttonIcon.classList.add('fa-arrow-up-short-wide');
  });

  modelCollapse.addEventListener('hide.bs.collapse', function() {
    buttonIcon.classList.remove('fa-arrow-up-short-wide');
    buttonIcon.classList.add('fa-arrow-down-short-wide');
  });
});
