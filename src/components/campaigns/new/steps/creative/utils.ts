export function deriveAspectRatio(
  platform: string | null | undefined,
  objective: string | null | undefined,
): "1:1" | "9:16" | "4:5" {
  if (platform === "tiktok") return "9:16";
  if (objective?.toString().includes("awareness")) return "9:16";
  if (objective?.toString().includes("sale")) return "4:5";
  return "1:1";
}
