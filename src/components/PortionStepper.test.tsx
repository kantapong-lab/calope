// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { th } from "@/copy/th";
import { PortionStepper } from "./PortionStepper";

afterEach(cleanup);

describe("PortionStepper (AC-9)", () => {
  it("steps by 25 and clamps at the limit", () => {
    const onCommit = vi.fn().mockReturnValue(null);
    render(<PortionStepper label="ปริมาณ" value={10} step={25} min={1} max={5000} onCommit={onCommit} />);
    fireEvent.click(screen.getByRole("button", { name: /ลด/ }));
    expect(onCommit).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: /เพิ่ม/ }));
    expect(onCommit).toHaveBeenLastCalledWith(35);
  });

  it("shows the committer's error under the field and marks it invalid", () => {
    render(<PortionStepper label="ปริมาณ" value={350} step={25} min={1} max={5000} onCommit={() => th.edit.gramsError} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "5001" } });
    expect(screen.getByText(th.edit.gramsError)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });
});
