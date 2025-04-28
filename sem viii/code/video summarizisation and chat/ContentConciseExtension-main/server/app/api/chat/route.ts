import { StreamingTextResponse } from 'ai'
import { experimental_buildLlama2Prompt } from 'ai/prompts'
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge'

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  const { messages } = await req.json();

  // Create a text generation stream
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: experimental_buildLlama2Prompt(messages),
          },
        ],
      },
    ],
    // generationConfig: {
    //   maxOutputTokens: 500,
    //   temperature: 0.1,
    // },
  });

  // Call text() method and clean the response
  const rawText = await result.response.text(); // Call the text() method
  const cleanedText = rawText.replace(/\*/g, ''); // Remove all asterisks (*)
// console.log('Cleaned text:', cleanedText); // Log the cleaned text
  // Respond with the cleaned stream
  return new StreamingTextResponse(cleanedText, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
    },
  });
}
