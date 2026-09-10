import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardParameters from "./Parameters";

const baseInputs = {
  disease: "A90",
  adm_level: 1 as const,
  adm_0: "BRA",
  adm_1: "RJ",
  adm_2: "",
  sprint: false,
  case_definition: "reported",
};

const diseaseOptions = [
  { code: "A90", name: "Dengue" },
  { code: "A91", name: "Other" },
];
const countryOptions = [{ geocode: "BRA", name: "Brazil" }];
const stateOptions = [{ geocode: "RJ", name: "Rio" }];
const cityOptions = [{ geocode: "CITY", name: "City" }];
const sprintOptions = [
  { id: 1, year: 2023 },
  { id: 2, year: 2024 },
];

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    isConfigLoading: false,
    inputs: baseInputs,
    availableCaseDefinitions: new Set(["reported", "probable"]),
    handleChange: vi.fn(),
    handleCaseDefinitionChange: vi.fn(),
    toggleSprint: vi.fn(),
    selectedSprints: [] as number[],
    diseaseOptions,
    countryOptions,
    stateOptions,
    cityOptions,
    sprintOptions,
    ...overrides,
  };
}

describe("components/dashboard/Parameters", () => {
  it("shows the config loading overlay", () => {
    const { container } = render(<DashboardParameters {...makeProps({ isConfigLoading: true })} />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders the disease select and forwards changes", () => {
    const handleChange = vi.fn();
    const { container } = render(<DashboardParameters {...makeProps({ handleChange })} />);
    const select = container.querySelector('select[name="disease"]') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { name: "disease", value: "A91" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("hides the disease select when there are no options", () => {
    const { container } = render(<DashboardParameters {...makeProps({ diseaseOptions: [] })} />);
    expect(container.querySelector('select[name="disease"]')).not.toBeInTheDocument();
  });

  it("renders the country select and forwards changes", () => {
    const handleChange = vi.fn();
    const { container } = render(<DashboardParameters {...makeProps({ handleChange })} />);
    const select = container.querySelector('select[name="adm_0"]') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { name: "adm_0", value: "BRA" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("hides the country select when there are no options", () => {
    const { container } = render(<DashboardParameters {...makeProps({ countryOptions: [] })} />);
    expect(container.querySelector('select[name="adm_0"]')).not.toBeInTheDocument();
  });

  it("shows state and city selects at the matching adm levels", () => {
    const { container } = render(
      <DashboardParameters {...makeProps({ inputs: { ...baseInputs, adm_level: 2 } })} />
    );
    expect(container.querySelector('select[name="adm_1"]')).toBeInTheDocument();
    expect(container.querySelector('select[name="adm_2"]')).toBeInTheDocument();
  });

  it("hides the state select at national level", () => {
    const { container } = render(
      <DashboardParameters {...makeProps({ inputs: { ...baseInputs, adm_level: 0 } })} />
    );
    expect(container.querySelector('select[name="adm_1"]')).not.toBeInTheDocument();
    expect(container.querySelector('select[name="adm_2"]')).not.toBeInTheDocument();
  });

  it("hides the city select at state level", () => {
    const { container } = render(<DashboardParameters {...makeProps()} />);
    expect(container.querySelector('select[name="adm_2"]')).not.toBeInTheDocument();
  });

  it("renders case definition buttons and calls the handler for available ones", async () => {
    const handleCaseDefinitionChange = vi.fn();
    render(
      <DashboardParameters
        {...makeProps({
          handleCaseDefinitionChange,
          availableCaseDefinitions: new Set(["reported"]),
        })}
      />
    );

    const probable = screen.getByRole("button", { name: "dashboard.filters.probable" });
    expect(probable).toBeDisabled();

    const reported = screen.getByRole("button", { name: "dashboard.filters.reported" });
    await userEvent.click(reported);
    expect(handleCaseDefinitionChange).toHaveBeenCalledWith("reported");
  });

  it("does not fire the handler for unavailable case definitions", async () => {
    const handleCaseDefinitionChange = vi.fn();
    render(
      <DashboardParameters
        {...makeProps({
          handleCaseDefinitionChange,
          availableCaseDefinitions: new Set(["reported"]),
        })}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "dashboard.filters.probable" }));
    expect(handleCaseDefinitionChange).not.toHaveBeenCalled();
  });

  it("renders sprint options in sprint mode and toggles selection", async () => {
    const toggleSprint = vi.fn();
    render(
      <DashboardParameters
        {...makeProps({
          inputs: { ...baseInputs, sprint: true },
          toggleSprint,
          selectedSprints: [2024],
        })}
      />
    );

    expect(screen.queryByRole("button", { name: "dashboard.filters.reported" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "2023" }));
    expect(toggleSprint).toHaveBeenCalledWith(2023);
    expect(screen.getByRole("button", { name: "2024" })).toBeInTheDocument();
  });

  it("renders nothing extra in sprint mode without sprint options", () => {
    render(
      <DashboardParameters
        {...makeProps({ inputs: { ...baseInputs, sprint: true }, sprintOptions: [] })}
      />
    );
    expect(screen.queryByText("dashboard.filters.imdc_sprint")).not.toBeInTheDocument();
  });
});
