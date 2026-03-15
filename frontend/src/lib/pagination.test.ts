import { describe, expect, it } from "vitest";
import { calculateTotalPages } from "./pagination";

describe("calculateTotalPages", () => {
    it("returns 1 when total is 0", () => {
        expect(calculateTotalPages(0, 10)).toBe(1);
    });

    it("returns 1 when total fits in one page", () => {
        expect(calculateTotalPages(5, 10)).toBe(1);
        expect(calculateTotalPages(10, 10)).toBe(1);
    });

    it("calculates pages correctly when total exceeds page size", () => {
        expect(calculateTotalPages(11, 10)).toBe(2);
        expect(calculateTotalPages(20, 10)).toBe(2);
        expect(calculateTotalPages(21, 10)).toBe(3);
        expect(calculateTotalPages(100, 10)).toBe(10);
    });

    it("rounds up for partial last page", () => {
        expect(calculateTotalPages(1, 10)).toBe(1);
        expect(calculateTotalPages(9, 10)).toBe(1);
        expect(calculateTotalPages(101, 10)).toBe(11);
    });

    it("returns 1 when pageSize is 0", () => {
        expect(calculateTotalPages(100, 0)).toBe(1);
    });

    it("returns 1 when pageSize is negative", () => {
        expect(calculateTotalPages(100, -1)).toBe(1);
    });

    it("handles page size of 1", () => {
        expect(calculateTotalPages(5, 1)).toBe(5);
        expect(calculateTotalPages(1, 1)).toBe(1);
    });
});
