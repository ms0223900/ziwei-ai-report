/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompensationForm } from "./CompensationForm";

const ORDER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function respond(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe("CompensationForm", () => {
  it("requires a reason before calling the API", async () => {
    const fetchSpy = respond(200, { result: "ok" });
    vi.stubGlobal("fetch", fetchSpy);
    const user = userEvent.setup();
    render(<CompensationForm orderId={ORDER_ID} />);

    await user.click(screen.getByRole("button", { name: "補 5 點" }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("請填寫處置原因。");
  });

  it("posts credit_points and shows the ok result", async () => {
    const fetchSpy = respond(200, { result: "ok" });
    vi.stubGlobal("fetch", fetchSpy);
    const user = userEvent.setup();
    render(<CompensationForm orderId={ORDER_ID} />);

    await user.type(screen.getByLabelText("處置原因（必填）"), " Webhook 漏送 ");
    await user.click(screen.getByRole("button", { name: "補 5 點" }));

    expect(fetchSpy).toHaveBeenCalledWith("/api/admin/compensations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "credit_points", sourceOrderId: ORDER_ID, reason: "Webhook 漏送" }),
    });
    expect(screen.getByRole("status").textContent).toContain("ok");
  });

  it("shows skipped_already_fulfilled", async () => {
    vi.stubGlobal("fetch", respond(200, { result: "skipped_already_fulfilled" }));
    const user = userEvent.setup();
    render(<CompensationForm orderId={ORDER_ID} />);

    await user.type(screen.getByLabelText("處置原因（必填）"), "重送");
    await user.click(screen.getByRole("button", { name: "補 5 點" }));

    expect(screen.getByRole("status").textContent).toContain("skipped_already_fulfilled");
  });

  it("shows the API error message on 422", async () => {
    vi.stubGlobal("fetch", respond(422, { result: "rejected", error: "這筆訂單不符合補點條件" }));
    const user = userEvent.setup();
    render(<CompensationForm orderId={ORDER_ID} />);

    await user.type(screen.getByLabelText("處置原因（必填）"), "試補");
    await user.click(screen.getByRole("button", { name: "補 5 點" }));

    expect(screen.getByRole("status").textContent).toBe("這筆訂單不符合補點條件");
  });

  it("shows a readable message when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline");
    }));
    const user = userEvent.setup();
    render(<CompensationForm orderId={ORDER_ID} />);

    await user.type(screen.getByLabelText("處置原因（必填）"), "試補");
    await user.click(screen.getByRole("button", { name: "補 5 點" }));

    expect(screen.getByRole("status").textContent).toContain("補點失敗");
  });
});
