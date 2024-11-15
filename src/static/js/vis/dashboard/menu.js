function toggleBtn(dashboard, parameter) {
  const base = new String(`${dashboard}-${parameter}`);
  const arrow = document.getElementById(`${base}-arrow`);
  const options = document.getElementById(`${base}-options`);

  options.classList.toggle('show');
  arrow.classList.toggle('fa-chevron-up', options.classList.contains('show'));
  arrow.classList.toggle('fa-chevron-down', !options.classList.contains('show'));
}

function selectDashboard(dashboard) {
  const dashboardOptions = document.getElementById(`-dashboard-options`);
  const options = dashboardOptions.querySelectorAll('a');
  options.forEach(dashboardBtn => {
    dashboardBtn.classList.remove('selected');
    if (dashboardBtn.getAttribute('data-value') === dashboard) {
      dashboardBtn.classList.add('selected');
    }
  });

  document.querySelectorAll('[id^="ds1-"], [id^="ds2-"], [id^="ds3-"]').forEach(div => {
    div.classList.remove('active');
    div.classList.add('hidden');
  });

  ['ds1', 'ds2', 'ds3'].forEach(ds => {
    const div = document.getElementById(`${ds}-${dashboard}`);
    if (div) {
      div.classList.remove('hidden');
      div.classList.add('active');
    }
  });

  storageSelect(dashboard);
}

function selectParameter(dashboard, parameter, value) {
  const storage = JSON.parse(localStorage.getItem('dashboards'));
  storage[dashboard][parameter] = value;
  localStorage.setItem('dashboards', JSON.stringify(storage));

  const options = document.getElementById(`${dashboard}-${parameter}-options`);

  options.querySelectorAll('a').forEach(option => {
    option.classList.remove('selected');
    if (String(option.getAttribute('data-value')) === String(value)) {
      option.classList.add('selected');
    }
  });

  const admData = dashboards[dashboard]["adm_data"][storage[dashboard]["disease"]][storage[dashboard]["time_resolution"]];
  const adm_2Btn = document.getElementById(`${dashboard}-adm_2`);

  if (parameter === "adm_level") {
    if (String(value) === "1") {
      if (adm_2Btn) adm_2Btn.classList.add('hidden');
      populateAdm1Menu(dashboard, admData["adm_1"]);
    } else if (String(value) === "2") {
      if (adm_2Btn) adm_2Btn.classList.remove('hidden');
      const adm1Options = admData["adm_2"].map(item => ufCodes[parseInt(String(item[0]).slice(0, 2), 10)]);
      populateAdm1Menu(dashboard, adm1Options);
    }
  }

  const admLevel2 = document.getElementById(`${dashboard}-adm_level-2`);
  if (admLevel2) admLevel2.classList.add('hidden');
  if (admData["adm_2"] && admData["adm_2"].length === 0) {
    if (String(storage[dashboard]["adm_level"]) !== "1") {
      selectParameter(dashboard, "adm_level", 1);
    }
    if (admLevel2) admLevel2.classList.add('hidden');
  } else {
    if (admLevel2) admLevel2.classList.remove('hidden');
  }

  if (String(storage[dashboard]["adm_level"]) === "2" && admData["adm_2"] && storage[dashboard]["adm_1"]) {
    const ufCode = codesUfs[storage[dashboard]["adm_1"]];
    const adm2Options = admData["adm_2"].filter(([code, name]) => String(code).slice(0, 2) === String(ufCode));
    populateAdm2Menu(dashboard, adm2Options);
  }
}

function storageSelect(dashboard) {
  const storage = JSON.parse(localStorage.getItem('dashboards'));
  ["disease", "time_resolution", "adm_level"].forEach(parameter => {
    selectParameter(dashboard, parameter, storage[dashboard][parameter])
  });
  selectAdm1(dashboard, storage[dashboard]["adm_1"]);
}

function selectAdm1(dashboard, uf) {
  const storage = JSON.parse(localStorage.getItem('dashboards'));
  storage[dashboard]["adm_1"] = uf;
  localStorage.setItem('dashboards', JSON.stringify(storage));

  const adm1Btn = document.getElementById(`${dashboard}-adm_1`);
  const options = document.getElementById(`${dashboard}-adm_1-options`);
  if (options) {
    options.querySelectorAll('li').forEach(option => {
      option.classList.remove('selected');
      if (option.getAttribute('data-value') === uf) {
        option.classList.add('selected');
        adm1Btn.innerHTML = option.innerHTML;
      }
    });
  }

  const admData = dashboards[dashboard]["adm_data"][storage[dashboard]["disease"]][storage[dashboard]["time_resolution"]];
  if (admData["adm_2"]) {
    const ufCode = codesUfs[uf];
    const adm2Options = admData["adm_2"].filter(([code, name]) => String(code).slice(0, 2) === String(ufCode));
    populateAdm2Menu(dashboard, adm2Options);
  }
}

function selectAdm2(dashboard, geocode, name) {
  const storage = JSON.parse(localStorage.getItem('dashboards'));
  storage[dashboard]["adm_2"] = geocode;
  localStorage.setItem('dashboards', JSON.stringify(storage));

  const adm2Btn = document.getElementById(`${dashboard}-adm_2`);
  const options = document.getElementById(`${dashboard}-adm_2-options`);
  if (options) {
    options.querySelectorAll('li').forEach(option => {
      option.classList.remove('selected');
      if (String(option.getAttribute('data-value')) === String(geocode)) {
        option.classList.add('selected');
        adm2Btn.innerHTML = option.innerHTML;
      }
    });
  }
}

function attachMenu(menu, button, list) {
  menu.appendChild(list);
  button.insertAdjacentElement('afterend', menu);

  button.addEventListener('click', (e) => {
    const rect = button.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.maxHeight = `${window.innerHeight - rect.bottom}px`;
    menu.style.overflowY = 'auto';
    menu.style.visibility = menu.style.visibility === 'visible' ? 'hidden' : 'visible';
    e.stopPropagation();

    document.querySelectorAll('.ds2-menu').forEach((m) => {
      if (m !== menu) {
        m.style.visibility = 'hidden';
      }
    });

    if (list.querySelector('.selected')) {
      list.querySelector('.selected').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  document.addEventListener('click', () => {
    menu.style.visibility = 'hidden';
  });

  menu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

function populateAdm1Menu(dashboard, ufs) {
  const storage = JSON.parse(localStorage.getItem('dashboards'));
  const button = document.getElementById(`${dashboard}-adm_1`);

  if (button.nextElementSibling && button.nextElementSibling.classList.contains('ds2-menu')) {
    button.nextElementSibling.remove();
  }

  button.innerHTML = '';
  const menu = document.createElement('div');
  menu.className = 'ds2-menu bg-dark text-white';
  const list = document.createElement('ul');
  list.id = `${dashboard}-adm_1-options`;

  const options = ufs.sort();

  options.forEach(uf => {
    const listItem = document.createElement('li');
    listItem.setAttribute('data-value', uf);
    listItem.textContent = ufNames[uf];
    listItem.addEventListener('click', () => {
      selectAdm1(dashboard, uf);
      menu.style.visibility = 'hidden';
    });
    list.appendChild(listItem);
  });

  attachMenu(menu, button, list);

  const storageAdm1 = storage[dashboard]["adm_1"];
  const local = JSON.parse(localStorage.getItem('local'));
  const selectedAdm1 =
    options.includes(storageAdm1) ? storageAdm1 :
      options.includes(local?.state.uf) ? local.state.uf :
        options[0];

  if (selectedAdm1) selectAdm1(dashboard, selectedAdm1);
}

function populateAdm2Menu(dashboard, options) {
  const storage = JSON.parse(localStorage.getItem('dashboards'));
  const button = document.getElementById(`${dashboard}-adm_2`);

  if (String(storage[dashboard]["adm_level"]) !== "2" || options.length === 0) {
    return
  }

  if (button.nextElementSibling && button.nextElementSibling.classList.contains('ds2-menu')) {
    button.nextElementSibling.remove();
  }

  button.innerHTML = '';
  const menu = document.createElement('div');
  menu.className = 'ds2-menu bg-dark text-white';
  const list = document.createElement('ul');
  list.id = `${dashboard}-adm_2-options`;

  options.forEach(([geocode, name]) => {
    const listItem = document.createElement('li');
    listItem.setAttribute('data-value', geocode);
    listItem.textContent = name;
    listItem.addEventListener('click', () => {
      selectAdm2(dashboard, [geocode, name]);
      menu.style.visibility = 'hidden';
    });
    list.appendChild(listItem);
  });

  attachMenu(menu, button, list);

  if (storage[dashboard]["adm_2"] && options.some(([geocode]) => String(geocode) === String(storage[dashboard]["adm_2"]))) {
    selectAdm2(dashboard, storage[dashboard]["adm_2"]);
  } else {
    const local = JSON.parse(localStorage.getItem('local'));
    if (local && options.some(([geocode]) => String(geocode) === String(local.geocode))) {
      selectAdm2(dashboard, parseInt(local.geocode));
    } else {
      selectAdm2(dashboard, list.querySelector('li').getAttribute('data-value'));
    }
  }
}
