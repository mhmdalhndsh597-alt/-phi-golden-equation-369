import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ConnectionStatus from "./ConnectionStatus";

beforeEach(() => {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
});

describe("ConnectionStatus", () => {
  it("shows an explicit offline state after the browser offline event", () => {
    render(<ConnectionStatus />);
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    fireEvent(window, new Event("offline"));
    expect(screen.getByRole("status").textContent).toContain("وضع عدم الاتصال");
  });
});
