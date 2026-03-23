export async function callOpenRouter(modelName: string, code: string, systemPrompt: string) {
  try {
    console.log(`[SERVICE] Calling OpenRouter Model (Direct Fetch): ${modelName}`);
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-OpenRouter-Title": "CodeShield AI",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": modelName,
        "messages": [
          { "role": "system", "content": systemPrompt },
          { "role": "user", "content": code }
        ],
        "max_tokens": 2666,
        "response_format": { "type": "json_object" }
      })
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(`${data.error.code} ${data.error.message}`);
    }

    const content = data.choices[0].message.content;

    if (!content) {
      throw new Error(`Failed to get a valid response from OpenRouter for model: ${modelName}`);
    }

    return content;
  } catch (error: any) {
    console.error(`[SERVICE_FAIL] OpenRouter Direct Error (${modelName}):`, error.message);
    throw error;
  }
}
