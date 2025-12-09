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
    description: "Through this API endpoint, you can fetch several climate variables...",
    more_info_link: "https://api.mosqlimate.org/docs/datastore/GET/climate/",
    tags: ["temperature", "municipal", "daily"],
    data_variables: [
      // ... copy variables
    ],
    chart_options: [
      { option: "geocode", type: "int" },
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
