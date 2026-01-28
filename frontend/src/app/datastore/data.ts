import { EndpointDetails } from "./types";

export const getEndpoints = (t: (key: string) => string): EndpointDetails[] => [
  {
    endpoint: "/infodengue/",
    name: t("datastore.infodengue.title"),
    description: t("datastore.infodengue.description"),
    more_info_link: "https://api.mosqlimate.org/docs/datastore/GET/infodengue/",
    tags: ["dengue", "municipal", "weekly"],
    data_variables: [
      {
        variable: "data_iniSE",
        type: "str",
        description: t("datastore.infodengue.variables.data_iniSE"),
      },
      {
        variable: "SE",
        type: "int",
        description: t("datastore.infodengue.variables.SE"),
      },
      {
        variable: "casos_est",
        type: "float",
        description: t("datastore.infodengue.variables.casos_est"),
      },
      {
        variable: "casos_est_min",
        type: "int",
        description: t("datastore.infodengue.variables.casos_est_min"),
      },
      {
        variable: "casos",
        type: "int",
        description: t("datastore.infodengue.variables.casos"),
      },
      {
        variable: "municipio_geocodigo",
        type: "int",
        description: t("datastore.infodengue.variables.municipio_geocodigo"),
      },
      {
        variable: "p_rt1",
        type: "float",
        description: t("datastore.infodengue.variables.p_rt1"),
      },
      {
        variable: "p_inc100k",
        type: "float",
        description: t("datastore.infodengue.variables.p_inc100k"),
      },
      {
        variable: "Localidade_id",
        type: "int",
        description: t("datastore.infodengue.variables.Localidade_id"),
      },
      {
        variable: "nivel",
        type: "int",
        description: t("datastore.infodengue.variables.nivel"),
      },
      {
        variable: "id",
        type: "int",
        description: t("datastore.infodengue.variables.id"),
      },
      {
        variable: "versao_modelo",
        type: "str",
        description: t("datastore.infodengue.variables.versao_modelo"),
      },
      {
        variable: "Rt",
        type: "float",
        description: t("datastore.infodengue.variables.Rt"),
      },
      {
        variable: "municipio_nome",
        type: "str",
        description: t("datastore.infodengue.variables.municipio_nome"),
      },
      {
        variable: "pop",
        type: "float",
        description: t("datastore.infodengue.variables.pop"),
      },
      {
        variable: "receptivo",
        type: "int",
        description: t("datastore.infodengue.variables.receptivo"),
      },
      {
        variable: "transmissao",
        type: "int",
        description: t("datastore.infodengue.variables.transmissao"),
      },
      {
        variable: "nivel_inc",
        type: "int",
        description: t("datastore.infodengue.variables.nivel_inc"),
      },
      {
        variable: "umidmax",
        type: "float",
        description: t("datastore.infodengue.variables.umidmax"),
      },
      {
        variable: "umidmed",
        type: "float",
        description: t("datastore.infodengue.variables.umidmed"),
      },
      {
        variable: "umidmin",
        type: "float",
        description: t("datastore.infodengue.variables.umidmin"),
      },
      {
        variable: "tempmax",
        type: "float",
        description: t("datastore.infodengue.variables.tempmax"),
      },
      {
        variable: "tempmed",
        type: "float",
        description: t("datastore.infodengue.variables.tempmed"),
      },
      {
        variable: "tempmin",
        type: "float",
        description: t("datastore.infodengue.variables.tempmin"),
      },
      {
        variable: "casprov",
        type: "int",
        description: t("datastore.infodengue.variables.casprov"),
      },
      {
        variable: "casprov_est",
        type: "float",
        description: t("datastore.infodengue.variables.casprov_est"),
      },
      {
        variable: "casprov_est_min",
        type: "int",
        description: t("datastore.infodengue.variables.casprov_est_min"),
      },
      {
        variable: "casprov_est_max",
        type: "int",
        description: t("datastore.infodengue.variables.casprov_est_max"),
      },
      {
        variable: "casconf",
        type: "int",
        description: t("datastore.infodengue.variables.casconf"),
      },
    ],
    chart_options: [
      { option: "disease", type: "str" },
      { option: "geocode", type: "int" },
      { option: "start", type: "date" },
      { option: "end", type: "date" },
    ],
  },
  {
    endpoint: "/climate/",
    name: t("datastore.climate.title"),
    description: t("datastore.climate.description"),
    more_info_link: "https://api.mosqlimate.org/docs/datastore/GET/climate/",
    tags: ["Temperature", "Municipal", "Daily"],
    data_variables: [
      {
        variable: "date",
        type: "date (YYYY-mm-dd)",
        description: t("datastore.climate.variables.date"),
      },
      {
        variable: "geocodigo",
        type: "int",
        description: t("datastore.climate.variables.geocodigo"),
      },
      {
        variable: "temp_min",
        type: "float (°C)",
        description: t("datastore.climate.variables.temp_min"),
      },
      {
        variable: "temp_med",
        type: "float (°C)",
        description: t("datastore.climate.variables.temp_med"),
      },
      {
        variable: "temp_max",
        type: "float (°C)",
        description: t("datastore.climate.variables.temp_max"),
      },
      {
        variable: "precip_min",
        type: "float (mm)",
        description: t("datastore.climate.variables.precip_min"),
      },
      {
        variable: "precip_med",
        type: "float (mm)",
        description: t("datastore.climate.variables.precip_med"),
      },
      {
        variable: "precip_max",
        type: "float (mm)",
        description: t("datastore.climate.variables.precip_max"),
      },
      {
        variable: "precip_tot",
        type: "float (mm)",
        description: t("datastore.climate.variables.precip_tot"),
      },
      {
        variable: "pressao_min",
        type: "float (atm)",
        description: t("datastore.climate.variables.pressao_min"),
      },
      {
        variable: "pressao_med",
        type: "float (atm)",
        description: t("datastore.climate.variables.pressao_med"),
      },
      {
        variable: "pressao_max",
        type: "float (atm)",
        description: t("datastore.climate.variables.pressao_max"),
      },
      {
        variable: "umid_min",
        type: "float (%)",
        description: t("datastore.climate.variables.umid_min"),
      },
      {
        variable: "umid_med",
        type: "float (%)",
        description: t("datastore.climate.variables.umid_med"),
      },
      {
        variable: "umid_max",
        type: "float (%)",
        description: t("datastore.climate.variables.umid_max"),
      },
    ],
    chart_options: [
      { option: "city", type: "string" },
      { option: "start", type: "date" },
      { option: "end", type: "date" },
    ],
  },
  {
    endpoint: "/mosquito/",
    name: t("datastore.mosquito.title"),
    description: t("datastore.mosquito.description"),
    more_info_link: "https://api.mosqlimate.org/docs/datastore/GET/mosquito/",
    tags: ["ContaOvos", "municipal", "daily"],
    data_variables: [
      {
        variable: "counting_id",
        type: "int",
        description: t("datastore.mosquito.variables.counting_id"),
      },
      {
        variable: "date",
        type: "str",
        description: t("datastore.mosquito.variables.date"),
      },
      {
        variable: "date_collect",
        type: "str",
        description: t("datastore.mosquito.variables.date_collect"),
      },
      {
        variable: "eggs",
        type: "int",
        description: t("datastore.mosquito.variables.eggs"),
      },
      {
        variable: "latitude",
        type: "float",
        description: t("datastore.mosquito.variables.latitude"),
      },
      {
        variable: "longitude",
        type: "float",
        description: t("datastore.mosquito.variables.longitude"),
      },
      {
        variable: "municipality",
        type: "str",
        description: t("datastore.mosquito.variables.municipality"),
      },
      {
        variable: "municipality_code",
        type: "str",
        description: t("datastore.mosquito.variables.municipality_code"),
      },
      {
        variable: "ovitrap_id",
        type: "str",
        description: t("datastore.mosquito.variables.ovitrap_id"),
      },
      {
        variable: "ovitrap_website_id",
        type: "int",
        description: t("datastore.mosquito.variables.ovitrap_website_id"),
      },
      {
        variable: "state_code",
        type: "str",
        description: t("datastore.mosquito.variables.state_code"),
      },
      {
        variable: "state_name",
        type: "str",
        description: t("datastore.mosquito.variables.state_name"),
      },
      {
        variable: "time",
        type: "str (date)",
        description: t("datastore.mosquito.variables.time"),
      },
      {
        variable: "week",
        type: "int",
        description: t("datastore.mosquito.variables.week"),
      },
      {
        variable: "year",
        type: "int",
        description: t("datastore.mosquito.variables.year"),
      },
    ],
    chart_options: [
      { option: "geocode", type: "int" },
      { option: "start", type: "date" },
      { option: "end", type: "date" },
    ],
  },
];
