import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiKey = process.env.AZURE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured." }, { status: 500 });
  }

  try {
    const { text, voice } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided." }, { status: 400 });
    }

    const endpoint = "https://spayp-mczbn2cn-eastus2.cognitiveservices.azure.com/";
    const deployment = "gpt-4o-mini-tts";
    const apiVersion = "2025-03-01-preview";
    const url = `${endpoint}openai/deployments/${deployment}/audio/speech?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: text,
        voice: voice || 'alloy',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Azure TTS Error:", errorBody);
      return new Response(`Error fetching audio from Azure: ${errorBody}`, { status: response.status });
    }

    const audioBlob = await response.blob();

    return new Response(audioBlob, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
