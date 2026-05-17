import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateAttributionToken, buildAttributionUrl } from "@/lib/attribution";
import { generateWhatsAppLink } from "@/lib/utils";

// ---------------------------------------------------------------------------
// generateWhatsAppLink
// ---------------------------------------------------------------------------

describe("generateWhatsAppLink", () => {
  it("converts Nigerian 080... format (11 digits) to international 234...", () => {
    const url = generateWhatsAppLink("08012345678");
    expect(url).toMatch(/^https:\/\/wa\.me\/2348012345678/);
  });

  it("passes through already-international 234... number unchanged", () => {
    const url = generateWhatsAppLink("2348012345678");
    expect(url).toMatch(/^https:\/\/wa\.me\/2348012345678/);
    // Must NOT double-prefix to 2342348...
    expect(url).not.toContain("2342348");
  });

  it("strips formatting characters (spaces, dashes, +) before normalizing", () => {
    const url = generateWhatsAppLink("+234 801 234 5678");
    expect(url).toMatch(/^https:\/\/wa\.me\/2348012345678/);
  });

  it("prepends 234 to a 10-digit number missing the leading 0", () => {
    const url = generateWhatsAppLink("8012345678");
    expect(url).toMatch(/^https:\/\/wa\.me\/2348012345678/);
  });

  it("URL-encodes the pre-filled message text", () => {
    const url = generateWhatsAppLink("08012345678", "Hi, is this available?");
    expect(url).toContain("text=Hi%2C%20is%20this%20available%3F");
  });

  it("produces empty text= param when no message is provided", () => {
    const url = generateWhatsAppLink("08012345678");
    expect(url).toContain("text=");
    // The text param value should be empty
    const params = new URL(url).searchParams;
    expect(params.get("text")).toBe("");
  });

  it("returns a valid wa.me HTTPS URL", () => {
    const url = generateWhatsAppLink("08012345678", "Hello");
    expect(() => new URL(url)).not.toThrow();
    expect(url.startsWith("https://wa.me/")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateAttributionToken
// ---------------------------------------------------------------------------

describe("generateAttributionToken", () => {
  it("returns 8 characters by default", () => {
    const token = generateAttributionToken();
    expect(token).toHaveLength(8);
  });

  it("returns the requested length when specified", () => {
    const token = generateAttributionToken(12);
    expect(token).toHaveLength(12);
  });

  it("contains only URL-safe characters (alphanumeric, hyphen, underscore)", () => {
    // Run many times to reduce flakiness from random generation
    for (let i = 0; i < 50; i++) {
      const token = generateAttributionToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("generates unique tokens each call", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateAttributionToken()));
    // Extremely unlikely to collide even once in 20 attempts
    expect(tokens.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// buildAttributionUrl
// ---------------------------------------------------------------------------

describe("buildAttributionUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv;
  });

  it("uses NEXT_PUBLIC_APP_URL when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://tenzu.africa";
    const url = buildAttributionUrl("abc12345");
    expect(url).toBe("https://tenzu.africa/l/abc12345");
  });

  it("falls back to https://Tenzu.app when env var is not set", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const url = buildAttributionUrl("abc12345");
    expect(url).toBe("https://Tenzu.app/l/abc12345");
  });

  it("accepts an explicit baseUrl override", () => {
    const url = buildAttributionUrl("abc12345", "https://custom.example.com");
    expect(url).toBe("https://custom.example.com/l/abc12345");
  });

  it("always places token under /l/ path", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://tenzu.africa";
    const token = "xK9mZ2pR";
    const url = buildAttributionUrl(token);
    expect(url).toContain("/l/" + token);
  });
});
