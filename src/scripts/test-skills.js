// use native fetch

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  const listResponse = await fetch("https://api.openai.com/v1/skills", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!listResponse.ok) {
    console.error("List failed:", listResponse.status, await listResponse.text());
    return;
  }
  const existingSkillsList = await listResponse.json();
  console.log("Existing Skills:", JSON.stringify(existingSkillsList, null, 2));

  for (const skill of existingSkillsList.data || []) {
      console.log(`Checking version for skill ${skill.name} (${skill.id})`);
      const versionRes = await fetch(
        `https://api.openai.com/v1/skills/${skill.id}/versions`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          // No body needed for an empty version just to test schema
        }
      );
      if (!versionRes.ok) {
        console.error("Version failed:", await versionRes.text());
        continue;
      }
      const versionData = await versionRes.json();
      console.log("Version Data:", JSON.stringify(versionData, null, 2));
      break;
  }
}
main();
