
class Prediction {
  constructor(prediction) {
    this.id = prediction.id;
    this.published = prediction.published;
    this.description = prediction.description;
    this.adm_1 = prediction.adm_1;
    this.adm_2 = prediction.adm_2;
    this.start_date = prediction.start_date;
    this.end_date = prediction.end_date;
    this.scores = prediction.scores;
    this.color = prediction.color;
    this.created = prediction.created;
  }

  updatePublished(published) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    this.published = published;

    return fetch(`/registry/prediction/${this.id}/publish/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
      },
      body: JSON.stringify({ published: published })
    });
  }
}

function list(predictions, is_author = false) {
  const c = document.getElementById('predictions');

  const gr = {};
  predictions.forEach(p => {
    if (!gr[p.adm_1]) {
      gr[p.adm_1] = {};
    }
    const adm2 = p.adm_2 || "__null__";
    if (!gr[p.adm_1][adm2]) {
      gr[p.adm_1][adm2] = [];
    }
    gr[p.adm_1][adm2].push(p);
  });

  const title = c.querySelector('h3');
  c.innerHTML = '';
  c.appendChild(title);

  Object.keys(gr).sort().forEach(adm_1 => {
    const header = document.createElement('h5');
    header.className = 'text-secondary mt-4';
    header.textContent = adm_1;
    c.appendChild(header);

    const adm2Groups = gr[adm_1];
    Object.keys(adm2Groups).sort().forEach(adm_2 => {
      const predictions = adm2Groups[adm_2].sort((a, b) => new Date(b.created) - new Date(a.created));

      if (adm_2 !== "__null__") {
        const subHeader = document.createElement('h6');
        subHeader.className = 'text-muted ms-2';
        subHeader.textContent = adm_2;
        c.appendChild(subHeader);
      }

      predictions.forEach(p => c.appendChild(item(p, is_author)));
    });
  });
}

function item(prediction, is_author = false) {
  const box = document.createElement('div');
  box.className = 'card mb-2 ms-3';
  box.style.borderLeft = `5px solid ${prediction.color || '#ccc'}`;

  const body = document.createElement('div');
  body.className = 'card-body py-2 px-3';

  const title = document.createElement('h6');
  title.className = 'card-title mb-1';

  const id = document.createElement('a');
  id.className = 'fw-bold text-primary text-decoration-none me-2';
  id.href = `/registry/prediction/${prediction.id}/`;
  id.textContent = `#${prediction.id}`;

  const description = document.createTextNode(prediction.description);
  title.appendChild(id);
  title.appendChild(description);

  const dates = document.createElement('p');
  dates.className = 'card-subtitle text-muted mb-1';
  dates.textContent = `${prediction.start_date} → ${prediction.end_date}`;

  const metaRow = document.createElement('div');
  metaRow.className = 'd-flex justify-content-between align-items-center';

  const created = document.createElement('p');
  created.className = 'text-muted small mb-0';
  created.textContent = prediction.created;

  metaRow.appendChild(created);

  if (is_author) {
    const published = document.createElement('div');
    published.className = 'form-check form-switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'form-check-input';
    input.checked = prediction.published;
    input.title = prediction.published ? 'Published' : 'Unpublished';

    input.addEventListener('change', () => {
      const checked = input.checked;
      const predObj = new Prediction(prediction);
      predObj.updatePublished(checked).catch(() => {
        input.checked = !checked;
      });
    });

    published.appendChild(input);
    metaRow.appendChild(published);
  }

  body.appendChild(title);
  body.appendChild(dates);
  body.appendChild(metaRow);

  box.appendChild(body);
  return box;
}
