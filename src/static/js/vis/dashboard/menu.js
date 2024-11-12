function dsBtnClick(event, data) {
  const parts = event.target.id.split("-");
  const key = parts[0];
  const dashboard = parts[1];
  const value = event.target.getAttribute('data-value');

  if (key !== "dashboard") {
    data[dashboard][key] = value;
    localStorage.setItem('dashboards', JSON.stringify(data));
  }
}
