import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

async function updateSkill(skillId) {
  const apiKey = process.env.OPENAI_API_KEY;
  const formData = new FormData();
  // Read a dummy file
  fs.writeFileSync('dummy.md', 'Hello World updated');
  formData.append('files[]', fs.createReadStream('dummy.md'), { filename: 'dummy.md', contentType: 'text/markdown' });

  // 1. Post to versions
  console.log('Posting new version...');
  const res = await fetch(`https://api.openai.com/v1/skills/${skillId}/versions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, ...formData.getHeaders() },
    body: formData
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log(data);

  if (data.id) {
    // 2. Set default version
    console.log('Setting default version to', data.id);
    const setRes = await fetch(`https://api.openai.com/v1/skills/${skillId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_version: data.id })
    });
    console.log('Set status:', setRes.status);
    console.log(await setRes.json());
  }
}
updateSkill("skill_69a47179a7548191ae28057f91c6664a02c4129b096a069e").catch(console.error);
