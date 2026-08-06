import { PrismaClient } from '@prisma/client';

async function run() {
  const prisma = new PrismaClient();
  const settings = await prisma.aiProviderSettings.findUnique({
    where: { id: 'global' }
  });
  const key = settings?.googleApiKey;
  console.log('Key length:', key?.length);
  
  if (!key) {
    console.log('No Google API key found.');
    return;
  }

  // List models
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100', {
    headers: { 'x-goog-api-key': key }
  });
  const data = await res.json();
  const models = data.models?.map(m => m.name) || [];
  console.log('Image/Video models:', models.filter(m => m.includes('imagen') || m.includes('video') || m.includes('veo')));
  
  // Try imagen
  const imgRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict', {
    method: 'POST',
    headers: {
      'x-goog-api-key': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instances: [{ prompt: "A futuristic city" }],
      parameters: { sampleCount: 1, aspectRatio: "1:1" }
    })
  });
  
  const imgData = await imgRes.json();
  console.log('Image predict response keys:', Object.keys(imgData));
  if (imgData.error) {
    console.log('Error:', imgData.error);
  }
  
  if (imgData.predictions && imgData.predictions.length > 0) {
     console.log('Has image bytes:', !!imgData.predictions[0].bytesBase64Encoded);
  }

  await prisma.$disconnect();
}

run().catch(console.error);