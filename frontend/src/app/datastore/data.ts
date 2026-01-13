import { EndpointDetails } from "./types";

export const endpoints: EndpointDetails[] = [
  {
    endpoint: "/infodengue/",
    name: "Mosquito-borne Diseases",
    description: "This endpoint gives access to data from the Infodengue project...",
    more_info_link: "https://api.mosqlimate.org/docs/datastore/GET/infodengue/",
    tags: ["dengue", "municipal", "weekly"],
    data_variables: [
      { variable: "data_iniSE", type: "str", description: "Start date of epidemiological week" },
      { variable: "SE", type: "int", description: "Epidemiological week" },
      // ... copy the rest of your variables here
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
    name: "Climate data",
    description: "Through this API endpoint, you can fetch several climate variables for brazilian cities",
    more_info_link: "https://api.mosqlimate.org/docs/datastore/GET/climate/",
    tags: ["Temperature", "Municipal", "Daily"],
    data_variables: [
      { variable: "date", type: "date (YYYY-mm-dd)", description: "Day of the year" },
      { variable: "geocodigo", type: "int", description: "IBGE's municipality code" },
      { variable: "temp_min", type: "float (°C)", description: "Minimum daily temperature" },
      { variable: "temp_med", type: "float (°C)", description: "Average daily temperature" },
      { variable: "temp_max", type: "float (°C)", description: "Maximum daily temperature" },
      { variable: "precip_min", type: "float (mm)", description: "Minimum daily precipitation" },
      { variable: "precip_med", type: "float (mm)", description: "Average daily precipitation" },
      { variable: "precip_max", type: "float (mm)", description: "Maximum daily precipitation" },
      { variable: "precip_tot", type: "float (mm)", description: "Total daily precipitation" },
      { variable: "pressao_min", type: "float (atm)", description: "Minimum daily sea level pressure" },
      { variable: "pressao_med", type: "float (atm)", description: "Average daily sea level pressure" },
      { variable: "pressao_max", type: "float (atm)", description: "Maximum daily sea level pressure" },
      { variable: "umid_min", type: "float (%)", description: "Minimum daily relative humidity" },
      { variable: "umid_med", type: "float (%)", description: "Average daily relative humidity" },
      { variable: "umid_max", type: "float (%)", description: "Maximum daily relative humidity" },
    ],
    chart_options: [
      { option: "city", type: "string" },
      { option: "start", type: "date" },
      { option: "end", type: "date" },
    ],
  },
  {
    endpoint: "/mosquito/",
    name: "Mosquito Egg Count",
    description: "Here you get access to mosquito abundance data...",
    more_info_link: "https://api.mosqlimate.org/docs/datastore/GET/mosquito/",
    tags: ["ContaOvos", "municipal", "daily"],
    data_variables: [
      // ... copy variables
    ],
    chart_options: [
      { option: "geocode", type: "int" },
      { option: "start", type: "date" },
      { option: "end", type: "date" },
    ],
  }
];
