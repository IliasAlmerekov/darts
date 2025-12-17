import { describe, it, expect } from "vitest";
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
      expect(() => parseThrowValue("Xabc")).toThrow("Invalid throw value: Xabc");
    });

    it("should throw error for empty string after modifier", () => {
      expect(() => parseThrowValue("D")).toThrow("Invalid throw value: D");
    });

    it("should throw error for non-numeric value after modifier", () => {
      expect(() => parseThrowValue("Tabc")).toThrow("Invalid throw value: Tabc");
    });
  });
});
