// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { th } from "@/copy/th";
import { ConsentPanel } from "./ConsentPanel";

afterEach(cleanup);

describe("ConsentPanel (AC-15)", () => {
  it("starts unticked with the action disabled and names Anthropic and the USA", () => {
    render(<ConsentPanel onAccept={() => {}} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: th.consent.button })).toBeDisabled();
    expect(screen.getByText("บริษัท Anthropic (ผู้ให้บริการ AI)")).toBeInTheDocument();
    expect(screen.getByText(/สหรัฐอเมริกา/, { selector: "dd" })).toBeInTheDocument();
  });

  it("enables the action only after the box is ticked", () => {
    const onAccept = vi.fn();
    render(<ConsentPanel onAccept={onAccept} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: th.consent.button }));
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("offers manual entry and shows the update notice when re-consenting", () => {
    render(<ConsentPanel updated onAccept={() => {}} />);
    expect(screen.getByText(th.consent.updated)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: th.consent.decline })).toHaveAttribute("href", "/manual");
  });
});
