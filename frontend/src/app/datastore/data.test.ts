import { describe, it, expect, vi } from "vitest";
import { getEndpoints } from "./data";

describe("datastore/data getEndpoints", () => {
  it("returns every endpoint with translated fields and chart options", () => {
    const t = vi.fn((key: string) => `t:${key}`);

    const endpoints = getEndpoints(t);

    expect(endpoints).toHaveLength(5);
    expect(endpoints.map((e) => e.endpoint)).toEqual([
      "/infodengue/",
      "/climate/",
      "/vegetation/",
      "/mosquito/",
      "/episcanner/",
    ]);

    endpoints.forEach((endpoint) => {
      expect(endpoint.name).toMatch(/^t:datastore\./);
      expect(endpoint.description).toMatch(/^t:datastore\./);
      expect(endpoint.data_variables.length).toBeGreaterThan(0);
      expect(endpoint.chart_options.length).toBeGreaterThan(0);
      endpoint.data_variables.forEach((v) => {
        expect(v.description).toMatch(/^t:datastore\./);
      });
    });

    expect(endpoints[0].name).toBe("t:datastore.infodengue.title");
    expect(endpoints[0].data_variables[0].description).toBe(
      "t:datastore.infodengue.variables.data_iniSE"
    );
    expect(t).toHaveBeenCalledWith("datastore.mosquito.variables.year");
    expect(t).toHaveBeenCalledWith("datastore.episcanner.variables.ep_dur");
  });

  it("does not reuse references between calls", () => {
    const t = (key: string) => key;
    const first = getEndpoints(t);
    const second = getEndpoints(t);
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
  });
});
