/**
 * Tests for src/app/api/pixel/route.ts
 *
 * The pixel endpoint always returns a 1×1 GIF — analytics recording is
 * purely a fire-and-forget side effect. Tests verify both the guaranteed
 * response contract and the side-effect behaviour.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — hoisted before route import
// ---------------------------------------------------------------------------

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    }),
  })),
}));

vi.mock("@/lib/api/meta", () => ({
  MetaService: { sendCAPIEvent: vi.fn().mockResolvedValue({}) },
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn((v: string) => v),
}));

import { createServerClient } from "@supabase/ssr";
import { GET } from "@/app/api/pixel/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORG_ID = "org-pixel-test";
const LINK_ID = "link-pixel-test";
const CAMPAIGN_ID = "camp-pixel-test";
const ORG_TOKEN = "pixel_token_abc";

function makePixelMock({
  orgData,
  linkData,
}: {
  orgData: { id: string } | null;
  linkData: { id: string; campaign_id: string } | null;
}) {
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockRpc = vi.fn().mockResolvedValue({ error: null });

  const client = {
    from: vi.fn((table: string) => {
      if (table === "organizations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: orgData }),
        };
      }
      if (table === "attribution_links") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: linkData }),
        };
      }
      if (table === "link_clicks") {
        return { insert: mockInsert };
      }
      return {};
    }),
    rpc: mockRpc,
  };

  (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(client);

  return { mockInsert, mockRpc };
}

/** Unique IP per call site avoids leaking rate-limit state between tests */
let ipCounter = 1000;
function freshIp() {
  return `10.0.${Math.floor(++ipCounter / 255)}.${ipCounter % 255}`;
}

function pixelRequest(params: Record<string, string>, ip = freshIp()) {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(`https://tenzu.africa/api/pixel?${qs}`, {
    headers: { "x-forwarded-for": ip },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/pixel — pixel endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Always returns 1×1 GIF ----------------------------------------------

  it("returns 200 with Content-Type image/gif", async () => {
    makePixelMock({ orgData: { id: ORG_ID }, linkData: null });

    const res = await GET(pixelRequest({ t: ORG_TOKEN }));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/gif");
  });

  // 2. Missing / invalid token still returns GIF --------------------------

  it("returns GIF even when token is missing", async () => {
    // No token → createServerClient is never called
    const res = await GET(pixelRequest({}));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/gif");
  });

  it("returns GIF even when org lookup returns null", async () => {
    makePixelMock({ orgData: null, linkData: null });

    const res = await GET(pixelRequest({ t: "unknown_token" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/gif");
  });

  // 3. view event — records click, does NOT call sales RPC -----------------

  it("records a view link_click without calling the sales RPC", async () => {
    const { mockInsert, mockRpc } = makePixelMock({
      orgData: { id: ORG_ID },
      linkData: { id: LINK_ID, campaign_id: CAMPAIGN_ID },
    });

    await GET(pixelRequest({ t: ORG_TOKEN, _ta: LINK_ID, e: "view" }));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "view",
        link_id: LINK_ID,
        campaign_id: CAMPAIGN_ID,
        organization_id: ORG_ID,
        destination_type: "website",
      }),
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });

  // 4. purchase event — calls update_campaign_sales_summary ---------------

  it("calls update_campaign_sales_summary RPC for purchase events", async () => {
    const { mockRpc } = makePixelMock({
      orgData: { id: ORG_ID },
      linkData: { id: LINK_ID, campaign_id: CAMPAIGN_ID },
    });

    await GET(
      pixelRequest({ t: ORG_TOKEN, _ta: LINK_ID, e: "purchase", v: "5000" }),
    );

    expect(mockRpc).toHaveBeenCalledWith("update_campaign_sales_summary", {
      p_campaign_id: CAMPAIGN_ID,
      p_amount_ngn: 5000,
    });
  });

  it("stores event_value_ngn on the link_clicks row for purchases", async () => {
    const { mockInsert } = makePixelMock({
      orgData: { id: ORG_ID },
      linkData: { id: LINK_ID, campaign_id: CAMPAIGN_ID },
    });

    await GET(
      pixelRequest({ t: ORG_TOKEN, _ta: LINK_ID, e: "purchase", v: "15000" }),
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_value_ngn: 15000 }),
    );
  });

  // 5. lead event — calls sales RPC with 0 revenue -------------------------

  it("calls update_campaign_sales_summary with 0 revenue for lead events", async () => {
    const { mockRpc } = makePixelMock({
      orgData: { id: ORG_ID },
      linkData: { id: LINK_ID, campaign_id: CAMPAIGN_ID },
    });

    await GET(pixelRequest({ t: ORG_TOKEN, _ta: LINK_ID, e: "lead" }));

    expect(mockRpc).toHaveBeenCalledWith("update_campaign_sales_summary", {
      p_campaign_id: CAMPAIGN_ID,
      p_amount_ngn: 0,
    });
  });

  // 6. Cross-org enforcement -----------------------------------------------

  it("does not record a click when _ta link belongs to a different org", async () => {
    // org resolves, but attribution_link lookup (with org boundary) returns null
    const { mockInsert } = makePixelMock({
      orgData: { id: ORG_ID },
      linkData: null, // org boundary check failed — link not in this org
    });

    await GET(
      pixelRequest({ t: ORG_TOKEN, _ta: "link-from-other-org", e: "view" }),
    );

    expect(mockInsert).not.toHaveBeenCalled();
  });

  // 7. No _ta → no insert (link_id NOT NULL constraint) --------------------

  it("does not attempt insert when _ta is not provided", async () => {
    const { mockInsert } = makePixelMock({
      orgData: { id: ORG_ID },
      linkData: null,
    });

    // token present but no _ta
    await GET(pixelRequest({ t: ORG_TOKEN }));

    expect(mockInsert).not.toHaveBeenCalled();
  });

  // 8. Rate limiting --------------------------------------------------------

  it("returns GIF on the 21st request but skips insert (rate limited)", async () => {
    const RATE_IP = `10.99.99.${++ipCounter % 255}`;
    let insertCalls = 0;

    // Each call creates a fresh mock — track inserts across calls
    (createServerClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn((table: string) => {
        if (table === "organizations") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: ORG_ID } }),
          };
        }
        if (table === "attribution_links") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi
              .fn()
              .mockResolvedValue({
                data: { id: LINK_ID, campaign_id: CAMPAIGN_ID },
              }),
          };
        }
        if (table === "link_clicks") {
          return {
            insert: vi.fn().mockImplementation(() => {
              insertCalls++;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({ error: null }),
    }));

    for (let i = 0; i < 21; i++) {
      const res = await GET(
        pixelRequest({ t: ORG_TOKEN, _ta: LINK_ID, e: "view" }, RATE_IP),
      );
      // GIF always returned even when rate limited
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/gif");
    }

    // Only 20 inserts should have been recorded (21st was rate-limited)
    expect(insertCalls).toBe(20);
  });
});
