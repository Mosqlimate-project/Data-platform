import { describe, it, expect, vi, beforeEach } from "vitest";

const makeForm = (fields: Record<string, string>) => {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.set(k, v));
  return form;
};

const makeReq = (form: FormData) => ({ formData: async () => form }) as any;

describe("app/api/user/register", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("returns upstream error text and status", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "username taken",
    });
    const { POST } = await import("./route");
    const res = await POST(makeReq(makeForm({ username: "bob" })));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("username taken");
  });

  it("registers and sets tokens on success", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ access_token: "at", refresh_token: "rt" }),
    });
    const { POST } = await import("./route");
    const res = await POST(
      makeReq(
        makeForm({
          username: "bob",
          password: "pw",
          email: "b@c.d",
          first_name: "B",
          last_name: "C",
          homepage_url: "https://x.dev",
        })
      )
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.cookies.get("access_token")?.value).toBe("at");
    expect(res.cookies.get("refresh_token")?.value).toBe("rt");

    const init = (global.fetch as any).mock.calls[0][1];
    expect(JSON.parse(init.body)).toEqual({
      username: "bob",
      password: "pw",
      email: "b@c.d",
      first_name: "B",
      last_name: "C",
      homepage_url: "https://x.dev",
      oauth_data: null,
    });
  });

  it("includes oauth_data when provided", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ access_token: "at", refresh_token: "rt" }),
    });
    const { POST } = await import("./route");
    await POST(makeReq(makeForm({ username: "bob", oauth_data: "{}" })));
    const init = (global.fetch as any).mock.calls[0][1];
    expect(JSON.parse(init.body).oauth_data).toBe("{}");
  });

  it("propagates upstream rejection", async () => {
    (global.fetch as any).mockRejectedValue(new Error("network"));
    const { POST } = await import("./route");
    await expect(POST(makeReq(makeForm({})))).rejects.toThrow("network");
  });
});
