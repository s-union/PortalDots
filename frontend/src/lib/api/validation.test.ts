import { describe, expect, it } from "vitest";
import {
    parseValidationError,
    extractValidationMessage,
    unwrapValidationError,
} from "./validation";

describe("parseValidationError", () => {
    it("parses a valid validation error object", () => {
        const input = {
            message: "Validation failed",
            errors: { name: ["必須項目です", "10文字以内で入力してください"] },
        };
        const result = parseValidationError(input, "circle");
        expect(result.message).toBe("Validation failed");
        expect(result.errors.name).toEqual(["必須項目です", "10文字以内で入力してください"]);
    });

    it("throws when input is not a valid validation error", () => {
        expect(() => parseValidationError(null, "circle")).toThrow(
            "Invalid circle validation error",
        );
        expect(() => parseValidationError({ message: "no errors field" }, "circle")).toThrow();
        expect(() => parseValidationError("string", "circle")).toThrow();
    });
});

describe("unwrapValidationError", () => {
    it("returns null for non-Error values", () => {
        expect(unwrapValidationError(null)).toBeNull();
        expect(unwrapValidationError("string")).toBeNull();
        expect(unwrapValidationError(42)).toBeNull();
    });

    it("returns null for Error without a valid cause", () => {
        expect(unwrapValidationError(new Error("plain error"))).toBeNull();
    });

    it("returns the validation error when Error has a valid cause", () => {
        const cause = { message: "Validation failed", errors: { name: ["必須項目です"] } };
        const error = new Error("wrapped", { cause });
        const result = unwrapValidationError(error);
        expect(result).toEqual(cause);
    });

    it("returns null when cause is not a valid validation error", () => {
        const error = new Error("wrapped", { cause: { notMessage: "x" } });
        expect(unwrapValidationError(error)).toBeNull();
    });
});

describe("extractValidationMessage", () => {
    it("returns fallback when error is not a validation error", () => {
        expect(extractValidationMessage(new Error("plain"), "エラーが発生しました")).toBe(
            "エラーが発生しました",
        );
        expect(extractValidationMessage(null, "デフォルト")).toBe("デフォルト");
    });

    it("returns first error message from the validation error cause", () => {
        const cause = {
            message: "Validation failed",
            errors: { name: ["必須項目です", "10文字以内で"] },
        };
        const error = new Error("wrapped", { cause });
        expect(extractValidationMessage(error, "フォールバック")).toBe("必須項目です");
    });

    it("returns fallback when errors object is empty", () => {
        const cause = { message: "Validation failed", errors: {} };
        const error = new Error("wrapped", { cause });
        expect(extractValidationMessage(error, "フォールバック")).toBe("フォールバック");
    });

    it("returns fallback when all error arrays are empty", () => {
        const cause = { message: "Validation failed", errors: { name: [] } };
        const error = new Error("wrapped", { cause });
        expect(extractValidationMessage(error, "フォールバック")).toBe("フォールバック");
    });
});
