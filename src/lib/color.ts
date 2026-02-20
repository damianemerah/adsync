// Algorithm to calculate brightness from RGB
// Returns "black" or "white" based on background
export function getContrastingTextColor(
  rgb: { r: number; g: number; b: number } | null,
): string {
  if (!rgb) return "#ffffff"; // Default to white if unknown

  // Standard luminance formula
  // (R*299 + G*587 + B*114) / 1000
  const brightness = Math.round(
    (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000,
  );

  // If brightness > 125, image is light -> use black text
  return brightness > 125 ? "#000000" : "#ffffff";
}

// Convert Hex to RGB
export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
