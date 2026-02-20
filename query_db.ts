import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Manually load .env.local because dotenv might not be installed or working as expected
const envPath = path.resolve(process.cwd(), ".env.local");
let envVars: Record<string, string> = {};

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf8");
  envVars = Object.fromEntries(
    envFile
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const idx = line.indexOf("=");
        if (idx === -1) return null;
        const key = line.slice(0, idx);
        let value = line.slice(idx + 1);
        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return [key, value];
      })
      .filter((entry): entry is [string, string] => entry !== null),
  );
}

const supabaseUrl =
  envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing Supabase credentials. Ensure .env.local exists or vars are set.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const targetId = "d7664945-76a6-4dc6-8702-9371b03bd6f6";
  console.log(`Querying ai_chat_history for ID: ${targetId}`);

  const { data, error } = await supabase
    .from("ai_chat_history")
    .select("*")
    .eq("id", targetId)
    .single();

  if (error) {
    console.error("Error fetching chat history:", error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

main();
