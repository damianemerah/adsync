/**
 * Shared utilities for Meta validation and discovery scripts.
 *
 * Extracts common infrastructure (env loading, decryption, credential fetching,
 * Meta API access) so that validate-meta-behaviors.ts, validate-meta-interests.ts,
 * and discover-meta-targeting.ts don't duplicate ~100 lines each.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const API_VERSION = "v25.0";
export const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// ─── Load .env.local ────────────────────────────────────────────────────────
// tsx doesn't auto-load .env.local — parse it manually
export function loadEnvLocal(scriptDir: string): void {
  const envPath = path.join(scriptDir, "../../.env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

// ─── AES-256 Decrypt (mirrors src/lib/crypto.ts) ────────────────────────────
// Supports both versioned format "v2:IV_HEX:ENCRYPTED_HEX"
// and legacy format "IV_HEX:ENCRYPTED_HEX"
export function decrypt(text: string): string {
  const key = process.env.ENCRYPTION_KEY!;
  const keyV1 = process.env.ENCRYPTION_KEY_V1;
  const parts = text.split(":");

  // New versioned format: "v2:IV:ENCRYPTED"
  if (parts[0].startsWith("v")) {
    const version = parts[0];
    const iv = Buffer.from(parts[1], "hex");
    const encryptedText = Buffer.from(parts[2], "hex");
    const activeKey = version === "v1" && keyV1 ? keyV1 : key;
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(activeKey),
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  // Legacy format (no version prefix): "IV:ENCRYPTED"
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = Buffer.from(parts[1], "hex");
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(key),
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    if (keyV1) {
      const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(keyV1),
        iv,
      );
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    }
    throw err;
  }
}

// ─── Fetch token + account ID from DB ───────────────────────────────────────
export async function getMetaCredentials(): Promise<{
  token: string;
  accountId: string;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const encKey = process.env.ENCRYPTION_KEY;

  if (!supabaseUrl || !serviceKey || !encKey) {
    console.error(
      "❌ Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data, error } = await supabase
    .from("ad_accounts")
    .select("access_token, platform_account_id, health_status, platform")
    .eq("platform", "meta")
    .eq("health_status", "healthy")
    .order("is_default", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error(
      "❌ No healthy Meta ad account found in DB:",
      error?.message ?? "no row",
    );
    console.error(
      "   Make sure at least one SME has connected their Meta account.",
    );
    process.exit(1);
  }

  const token = decrypt(data.access_token);
  const accountId = data.platform_account_id.startsWith("act_")
    ? data.platform_account_id
    : `act_${data.platform_account_id}`;

  return { token, accountId };
}

// ─── Generic Meta Graph API GET ─────────────────────────────────────────────
export async function metaGet(
  endpoint: string,
  token: string,
): Promise<any> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (json.error)
    throw new Error(`${json.error.code}: ${json.error.message}`);
  return json;
}
