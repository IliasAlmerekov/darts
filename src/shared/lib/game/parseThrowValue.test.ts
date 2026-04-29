// @vitest-environment node
import { describe, it, expect } from "vitest";
import { ApiError } from "@/shared/api";
import { parseThrowValue, type ParsedThrow } from "./parseThrowValue";

describe("parseThrowValue", () => {
  describe("when input is a number", () => {
    it("should return the value without modifiers", () => {
      const result = parseThrowValue(20);

      expect(result).toEqual<ParsedThrow>({
        value: 20,
        isDouble: false,
        isTriple: false,
      });
    });

    it("should handle zero", () => {
      const result = parseThrowValue(0);

      expect(result).toEqual<ParsedThrow>({
        value: 0,
        isDouble: false,
        isTriple: false,
      });
    });

    it("should handle bullseye (25)", () => {
      const result = parseThrowValue(25);

      expect(result).toEqual<ParsedThrow>({
        value: 25,
        isDouble: false,
        isTriple: false,
      });
    });
  });

  describe("when input is a double string", () => {
    it("should parse D20 as double 20", () => {
      const result = parseThrowValue("D20");

      expect(result).toEqual<ParsedThrow>({
        value: 20,
        isDouble: true,
        isTriple: false,
      });
    });

    it("should parse D25 as double bull (bullseye)", () => {
      const result = parseThrowValue("D25");

      expect(result).toEqual<ParsedThrow>({
        value: 25,
        isDouble: true,
        isTriple: false,
      });
    });

    it("should parse D1 correctly", () => {
      const result = parseThrowValue("D1");

      expect(result).toEqual<ParsedThrow>({
        value: 1,
        isDouble: true,
        isTriple: false,
      });
    });

    it("should parse D08 as decimal 8 when value has a leading zero", () => {
      const result = parseThrowValue("D08");

      expect(result).toEqual<ParsedThrow>({
        value: 8,
        isDouble: true,
        isTriple: false,
      });
    });
  });

  describe("when input is a triple string", () => {
    it("should parse T20 as triple 20", () => {
      const result = parseThrowValue("T20");

      expect(result).toEqual<ParsedThrow>({
        value: 20,
        isDouble: false,
        isTriple: true,
      });
    });

    it("should parse T19 correctly", () => {
      const result = parseThrowValue("T19");

      expect(result).toEqual<ParsedThrow>({
        value: 19,
        isDouble: false,
        isTriple: true,
      });
    });

    it("should parse T3 correctly", () => {
      const result = parseThrowValue("T3");

      expect(result).toEqual<ParsedThrow>({
        value: 3,
        isDouble: false,
        isTriple: true,
      });
    });
  });

  describe("error handling", () => {
    it("should throw error for invalid input", () => {
      expect(() => parseThrowValue("Xabc")).toThrowError(ApiError);
      expect(() => parseThrowValue("Xabc")).toThrow("Invalid throw value: Xabc");
    });

    it("should throw ApiError for invalid modifiers with numeric values", () => {
      const capturedError = (() => {
        try {
          parseThrowValue("X20");
          return null;
        } catch (error) {
          return error;
        }
      })();

      expect(capturedError).toBeInstanceOf(ApiError);
      expect(capturedError).toMatchObject({
        message: "Invalid throw value: X20",
        status: 400,
        data: { input: "X20" },
      });
    });

    it("should throw error for empty string after modifier", () => {
      expect(() => parseThrowValue("D")).toThrowError(ApiError);
      expect(() => parseThrowValue("D")).toThrow("Invalid throw value: D");
    });

    it("should throw error for non-numeric value after modifier", () => {
      expect(() => parseThrowValue("Tabc")).toThrowError(ApiError);
      expect(() => parseThrowValue("Tabc")).toThrow("Invalid throw value: Tabc");
    });

    it("should attach the invalid input payload to ApiError", () => {
      const capturedError = (() => {
        try {
          parseThrowValue("Tabc");
          return null;
        } catch (error) {
          return error;
        }
      })();

      expect(capturedError).toBeInstanceOf(ApiError);
      expect(capturedError).not.toBeNull();

      if (capturedError === null) {
        throw new Error("Expected parseThrowValue to throw ApiError for invalid input");
      }

      expect(capturedError).toMatchObject({
        message: "Invalid throw value: Tabc",
        status: 400,
        data: { input: "Tabc" },
      });
    });
  });
});
