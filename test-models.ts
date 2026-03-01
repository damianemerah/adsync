import OpenAI from "openai";

const openai = new OpenAI();
const testModel = async (model: string) => {
  try {
    const res = await (openai.responses.create as any)({
      model,
      input: "Hello",
      tools: [
        {
          type: "shell",
          environment: { type: "container_auto", skills: [] },
        },
      ],
    });
    console.log(`✅ ${model} works!`);
  } catch (e: any) {
    console.log(`❌ ${model} failed: ${e.message}`);
  }
};

(async () => {
  await testModel("gpt-5.1-mini"); // Candidate for Starter tier
  await testModel("gpt-5-mini"); // Candidate for refinement
  await testModel("gpt-5.1"); // Mid-range
  await testModel("gpt-5.2"); // Current production (Growth/Agency)
  await testModel("gpt-4.1-mini"); // Cheapest fallback
})();
