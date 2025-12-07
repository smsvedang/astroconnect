// api/astro.js
// Vercel / Next.js style serverless function (ESM)
// Uses @google/generative-ai

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is missing in environment.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Recommended fast + good model
// If 2.5 not available on your key, swap to "gemini-2.0-flash".
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

function buildPrompt(payload) {
  const {
    name,
    gender,
    dob,
    tob,
    city,
    state,
    country,
    notes,
    zodiac,
    lifePath,
  } = payload;

  return `
You are an experienced Vedic astrologer. You speak in a warm, practical and grounded tone.

User birth details:
- Name: ${name || "Unknown"}
- Gender: ${gender || "Unknown"}
- Date of Birth: ${dob || "Unknown"}
- Time of Birth: ${tob || "Unknown"}
- Birth Place: ${city || "Unknown"}, ${state || ""}, ${country || ""}
- Zodiac (Sun sign): ${zodiac || "Unknown"}
- Life Path Number (Numerology): ${lifePath || "Unknown"}
- Main concern / question: ${notes || "Not specified"}

IMPORTANT INSTRUCTIONS (MUST FOLLOW):

1) Structure your answer in exactly TWO clear sections:
   [ENGLISH]
   (detailed English explanation in paragraphs)

   [हिन्दी]
   (same explanation translated to Hindi in paragraphs)

2) DO NOT:
   - use bullet points
   - use numbered lists
   - use asterisks (*), underscores (_), or markdown headings
   - repeat English sentences inside the Hindi section

3) CONTENT:
   In both languages, cover:
   - Basic personality and nature based on zodiac and numerology
   - Emotional pattern and thinking style
   - Education and career possibilities
   - Money and stability pattern
   - Relationships and family life (general tone)
   - Health tendencies (very general, NO medical advice, just lifestyle guidance)
   - 1–2 gentle suggestions or remedies (like mindset, habits, gratitude, helping others)

4) TONE:
   - Be kind and practical
   - Do not scare the user
   - No absolute predictions like “this will surely happen”
   - Use words like “tendencies”, “possibilities”, “can improve by”, etc.

Now generate the answer in the format:

[ENGLISH]
...your English paragraphs...

[हिन्दी]
...your Hindi paragraphs...
`;
}

// Helper: safely get JSON body on Vercel/Next/Node
async function getBody(req) {
  if (req.body) {
    // Next.js API routes usually parse JSON already
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  // Fallback: raw stream (for plain Vercel functions)
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  return JSON.parse(raw);
}

// MAIN HANDLER
export default async function handler(req, res) {
  // Basic CORS support for local testing
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY missing on server" });
    return;
  }

  try {
    const body = await getBody(req);
    const prompt = buildPrompt(body);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text() || "";

    // Clean a bit, just in case
    text = text.replace(/\*/g, "").replace(/_/g, "").trim();

    res.status(200).json({ description: text });
  } catch (err) {
    console.error("astro API error:", err);

    res.status(500).json({
      error: "Failed to generate description",
      details: err.message || String(err),
    });
  }
}
