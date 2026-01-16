import { NextResponse } from "next/server";
import { generateAndSaveStrategy } from "@/lib/ai/service";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // 1. Secure the route
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // 2. Parse Input
  const body = await request.json();
  const { description, location } = body;

  console.log("Body:📁📁", body);

  if (!description)
    return NextResponse.json(
      { error: "Description required" },
      { status: 400 }
    );

  try {
    // 3. Call Service
    const strategy = await generateAndSaveStrategy({
      businessDescription: description,
      location: location,
    });

    // 4. (Optional) Log usage to DB for billing limits here

    return NextResponse.json(strategy);
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json(
      { error: "Failed to generate strategy" },
      { status: 500 }
    );
  }
}
