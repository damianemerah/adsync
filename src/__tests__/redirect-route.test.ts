/**
 * Tests for src/app/l/[token]/route.ts
 *
 * Strategy: mock @supabase/ssr so createServerClient returns a controllable
 * stub. All mock inserts return already-resolved Promises, which means the
 * fire-and-forget .then() callbacks fully run before `await GET()` returns —
 * JavaScript microtask semantics guarantee this.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before the route import
// ---------------------------------------------------------------------------

const mockInsert = vi.fn();
const mockRpc = vi.fn();
const mockSingle = vi.fn();

function makeSupabaseMock() {
  return {
    from: vi.fn((table: string) => {
      if (table === "attribution_links") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: mockSingle,
        };
      }
      if (table === "link_clicks") {
        return { insert: mockInsert };
      }
      return {};
    }),
    rpc: mockRpc,
  };
}

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => makeSupabaseMock()),
}));

// Import route AFTER mocks are in place
import { GET } from "@/app/l/[token]/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(token: string, extraParams = "") {
  return new NextRequest(
    `https://tenzu.africa/l/${token}${extraParams ? "?" + extraParams : ""}`,
  );
}

function makeParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /l/[token] — attribution redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: fire-and-forget insert resolves immediately so .then() runs
    mockInsert.mockResolvedValue({ error: null });
    mockRpc.mockResolvedValue({ error: null });
  });

  // 1. WhatsApp destination ------------------------------------------------

  it("returns 302 to the wa.me URL unchanged (no ?_ta appended)", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "link-wa-1",
        campaign_id: "camp-1",
        organization_id: "org-1",
        destination_url: "https://wa.me/2348012345678?text=Hi",
        destination_type: "whatsapp",
      },
      error: null,
    });

    const res = await GET(makeRequest("abc12345"), makeParams("abc12345"));

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "https://wa.me/2348012345678?text=Hi",
    );
    // No ?_ta should be appended to WhatsApp URLs
    expect(res.headers.get("location")).not.toContain("_ta");
  });

  // 2. Website destination -------------------------------------------------

  it("appends ?_ta={linkId} to website destination URLs", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "link-web-1",
        campaign_id: "camp-2",
        organization_id: "org-1",
        destination_url: "https://myshop.com",
        destination_type: "website",
      },
      error: null,
    });

    const res = await GET(makeRequest("xyz56789"), makeParams("xyz56789"));

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "https://myshop.com/?_ta=link-web-1",
    );
  });

  // 3. Unknown token -------------------------------------------------------

  it("redirects to homepage when token is not found", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const res = await GET(makeRequest("notfound"), makeParams("notfound"));

    // NextResponse.redirect() without explicit status defaults to 307
    expect([302, 307]).toContain(res.status);
    // Should redirect to the root of the request URL
    expect(res.headers.get("location")).toMatch(/\/$/);
    // No insert should be attempted
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // 4. fbclid capture -------------------------------------------------------

  it("includes fbclid in the link_clicks insert when present in query", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "link-fb-1",
        campaign_id: "camp-3",
        organization_id: "org-1",
        destination_url: "https://wa.me/2348012345678?text=Hi",
        destination_type: "whatsapp",
      },
      error: null,
    });

    await GET(
      makeRequest("fbtest1", "fbclid=IwAR_test_click_id_123"),
      makeParams("fbtest1"),
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ fbclid: "IwAR_test_click_id_123" }),
    );
  });

  // 5. No fbclid → null in insert ------------------------------------------

  it("sets fbclid: null in insert when no fbclid in URL", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "link-nofb-1",
        campaign_id: "camp-4",
        organization_id: "org-1",
        destination_url: "https://wa.me/2348099887766?text=Hello",
        destination_type: "whatsapp",
      },
      error: null,
    });

    await GET(makeRequest("nofbclid"), makeParams("nofbclid"));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ fbclid: null }),
    );
  });

  // 6. RPC skipped when campaign_id is null --------------------------------

  it("does NOT call increment_campaign_clicks when campaign_id is null", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "link-nocampaign-1",
        campaign_id: null,
        organization_id: "org-1",
        destination_url: "https://wa.me/2348012345678?text=Hi",
        destination_type: "whatsapp",
      },
      error: null,
    });

    await GET(makeRequest("nocampid"), makeParams("nocampid"));

    expect(mockRpc).not.toHaveBeenCalled();
  });

  // 7. RPC called with correct destination_type for WhatsApp ---------------

  it("calls increment_campaign_clicks with correct destination_type for WhatsApp", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "link-rpc-1",
        campaign_id: "camp-rpc-1",
        organization_id: "org-1",
        destination_url: "https://wa.me/2348012345678?text=Hi",
        destination_type: "whatsapp",
      },
      error: null,
    });

    await GET(makeRequest("rpctest"), makeParams("rpctest"));

    expect(mockRpc).toHaveBeenCalledWith("increment_campaign_clicks", {
      p_campaign_id: "camp-rpc-1",
      p_destination_type: "whatsapp",
    });
  });

  // 8. insert called with correct destination_type -------------------------

  it("records destination_type in link_clicks insert for WhatsApp", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "link-dtype-1",
        campaign_id: "camp-5",
        organization_id: "org-5",
        destination_url: "https://wa.me/2348099887766?text=Hello",
        destination_type: "whatsapp",
      },
      error: null,
    });

    await GET(makeRequest("dtypetest"), makeParams("dtypetest"));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        destination_type: "whatsapp",
        event_type: "click",
        organization_id: "org-5",
        campaign_id: "camp-5",
      }),
    );
  });
});
