import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const apiKey = process.env.AZURE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured." }, { status: 500 });
  }

  try {
    const { word } = await request.json();

    if (!word) {
      return NextResponse.json({ error: "No word provided to define." }, { status: 400 });
    }

    const endpoint = "https://spayp-mczbn2cn-eastus2.cognitiveservices.azure.com/";
    const deployment = "gpt-4o";
    const apiVersion = "2024-02-01";
    const url = `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const system_prompt = "You are a concise dictionary API. For the user-provided word, return its part of speech and a single, clear definition. You MUST respond ONLY with a valid JSON object containing two keys: 'type' (e.g., Noun, Verb, Adjective) and 'definition'. Do not add any extra text or explanation.";

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: word }
        ],
        max_tokens: 100,
        temperature: 0.5,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Azure AI Error:", errorBody);
      return NextResponse.json({ error: "Failed to get response from Azure AI.", details: errorBody }, { status: response.status });
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(content);

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
