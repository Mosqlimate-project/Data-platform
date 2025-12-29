export interface EndpointDataVar {
  variable: string;
  type: string;
  description: string;
}

export interface EndpointChartOption {
  option: string;
  type: string;
}

export interface EndpointDetails {
  endpoint: string;
  name: string;
  description: string;
  more_info_link: string;
  tags: string[];
  data_variables: EndpointDataVar[];
  chart_options: EndpointChartOption[];
}
