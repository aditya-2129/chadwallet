import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatNumber,
  shortenAddress,
} from "@/lib/utils";

describe("format helpers", () => {
  it("formats compact market values", () => {
    expect(formatNumber(1_250_000)).toBe("1.25M");
    expect(formatCurrency(1_250_000, true)).toContain("1.25M");
  });

  it("preserves useful precision for micro-cap prices", () => {
    expect(formatCurrency(0.00002131)).toContain("0.00002131");
  });

  it("shortens wallet addresses", () => {
    expect(shortenAddress("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")).toBe(
      "DezX...B263",
    );
  });
});
