import { VertexAI } from '@google-cloud/vertexai';
import AnthropicVertex from '@anthropic-ai/vertex-sdk';
import { GoogleAuth } from 'google-auth-library';

const credentialsVar = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
const projectNumber = '1086019342831';
const defaultLocation = 'us-central1';
const approvedLocation = 'us-east5';

let vertexAI: VertexAI | null = null;
let anthropic: AnthropicVertex | null = null;

if (credentialsVar) {
  try {
    const creds = JSON.parse(credentialsVar);
    // Correctly handle the private key with double-escaped backslashes for the regex
    const privateKey = creds.private_key.replace(/\\n/g, '\n');

    vertexAI = new VertexAI({
      project: projectNumber,
      location: defaultLocation,
      googleAuthOptions: {
        credentials: { client_email: creds.client_email, private_key: privateKey },
      },
    });

    anthropic = new AnthropicVertex({
      projectId: projectNumber,
      region: approvedLocation,
      // Cast to any to bypass strict type mismatch between different versions of GoogleAuth
      googleAuth: new GoogleAuth({
        credentials: { 
          client_email: creds.client_email, 
          private_key: privateKey 
        },
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      }) as any,
    });
    console.log("[SERVICE] Vertex and Anthropic clients initialized.");
  } catch (error) {
    console.error('[ERROR] Failed to initialize Vertex AI clients:', error);
  }
}

export async function callVertexAI(type: string, apiModel: string, code: string, systemPrompt: string) {
  try {
    if (type === 'anthropic') {
      if (!anthropic) throw new Error('Anthropic Vertex SDK not initialized.');
      console.log(`[SERVICE] Calling Claude: ${apiModel}`);
      const response = await anthropic.messages.create({
        max_tokens: 4096,
        messages: [{ role: 'user', content: `${systemPrompt}\n\nCode:\n${code}` }],
        model: apiModel,
      });
      const text = (response.content[0] as any).text;
      return text;

    } else if (type === 'mistral') {
      console.log(`[SERVICE] Calling MISTRAL (MaaS): ${apiModel}`);
      const creds = JSON.parse(credentialsVar!);
      const privateKey = creds.private_key.replace(/\\n/g, '\n');
      
      const auth = new GoogleAuth({
        credentials: { client_email: creds.client_email, private_key: privateKey },
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      const client = await auth.getClient();
      const token = await client.getAccessToken();
      const url = `https://${defaultLocation}-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/${defaultLocation}/publishers/mistralai/models/${apiModel}:rawPredict`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: apiModel,
          messages: [{ role: 'user', content: `${systemPrompt}\n\nCode:\n${code}` }],
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices[0].message.content;

    } else if (type === 'google') {
      if (!vertexAI) throw new Error('Vertex AI SDK not initialized.');
      console.log(`[SERVICE] Calling Gemini: ${apiModel}`);
      
      try {
        const generativeModel = vertexAI.getGenerativeModel({ model: apiModel });
        const result = await generativeModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nCode:\n${code}` }] }],
          generationConfig: { responseMimeType: 'application/json' }
        });
        const response = await result.response;
        return response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      } catch (geminiError: any) {
        if (apiModel !== 'gemini-2.0-flash-001') {
          console.warn(`[SERVICE_RETRY] Gemini ${apiModel} failed. Trying 2.0 Flash...`);
          return await callGeminiFallback(code, systemPrompt);
        }
        throw geminiError;
      }
    }
    throw new Error(`Unknown type: ${type}`);
  } catch (error: any) {
    console.error(`[SERVICE_FAIL] Vertex AI call failed for ${apiModel}:`, error.message);
    throw error;
  }
}

export async function callGeminiFallback(code: string, systemPrompt: string) {
    if (!vertexAI) throw new Error('Vertex AI SDK not initialized.');
    const fallbackModel = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
    const fallbackResult = await fallbackModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nCode:\n${code}` }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });
    return fallbackResult.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
}
