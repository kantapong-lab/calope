// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KcalRange } from "./KcalRange";

afterEach(cleanup);

describe("KcalRange (AC-5)", () => {
  it("renders low - high", () => {
    render(<KcalRange low={780} high={1020} />);
    expect(screen.getByText("780 - 1,020")).toBeInTheDocument();
  });

  it("renders N - N when equal", () => {
    render(<KcalRange low={200} high={200} />);
    expect(screen.getByText("200 - 200")).toBeInTheDocument();
  });
});
