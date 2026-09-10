import { describe, it, expect } from "vitest";
import type {
  EndpointDataVar,
  EndpointChartOption,
  EndpointDetails,
} from "./types";

describe("datastore/types", () => {
  it("describes an endpoint using the exported interfaces", () => {
    const variable: EndpointDataVar = {
      variable: "casos",
      type: "int",
      description: "Cases",
    };
    const option: EndpointChartOption = { option: "disease", type: "str" };
    const endpoint: EndpointDetails = {
      endpoint: "/infodengue/",
      name: "Infodengue",
      description: "desc",
      source: "src",
      more_info_link: "link",
      tags: ["dengue"],
      data_variables: [variable],
      chart_options: [option],
    };

    expect(endpoint.data_variables[0].variable).toBe("casos");
    expect(endpoint.chart_options[0].option).toBe("disease");
    expect(endpoint.tags).toContain("dengue");
  });
});
