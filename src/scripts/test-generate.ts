import { generateAndSaveStrategy } from "../lib/ai/service";

async function main() {
  try {
    const res = await generateAndSaveStrategy({
      businessDescription: "I sell Ankara bags and shoes in Lagos",
      location: "Lagos",
      objective: "whatsapp"
    });
    console.log("SUCCESS");
  } catch (e) {
    console.error(e);
  }
}
main();
