import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";

async function testUpdate() {
  const apiKey = process.env.OPENAI_API_KEY;
  const formData = new FormData();
  fs.writeFileSync("dummy.md", "Hello Test v2");
  formData.append("files[]", fs.createReadStream("dummy.md"), {
    filename: "dummy.md",
    contentType: "text/markdown",
  });

  const skillId = "skill_69a47179a7548191ae28057f91c6664a02c4129b096a069e";

  console.log("Creating new version");
  const res = await fetch(
    `https://api.openai.com/v1/skills/${skillId}/versions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, ...formData.getHeaders() },
      body: formData,
    },
  );
  const data = await res.json();
  console.log("Version status:", res.status);
  console.log(data);

  if (data.id) {
    console.log("Setting default version", data.id);
    const setRes = await fetch(`https://api.openai.com/v1/skills/${skillId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ default_version: data.id }),
    });
    console.log("Set status:", setRes.status);
    console.log(await setRes.json());
  }
}

testUpdate().catch(console.error);
