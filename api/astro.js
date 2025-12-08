// api/astro.js
// Clean English + Hindi version
// Uses @google/generative-ai (Vercel serverless style)

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is missing in environment.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Recommended model
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
You are a highly experienced Vedic astrologer.  
You explain things clearly, gently, and without fear-based statements.

User birth details:
- Name: ${name || "Unknown"}
- Gender: ${gender || "Unknown"}
- Date of Birth: ${dob || "Unknown"}
- Time of Birth: ${tob || "Unknown"}
- Birth Place: ${city || "Unknown"}, ${state || ""}, ${country || ""}
- Zodiac (Sun sign): ${zodiac || "Unknown"}
- Life Path Number: ${lifePath || "Unknown"}
- User's main concern: ${notes || "Not specified"}

IMPORTANT — YOUR OUTPUT MUST FOLLOW THIS EXACT STRUCTURE:

[ENGLISH]
(Detailed astrology explanation in English)

[HINDI]
(Write same explanation in pure Hindi Devanagari.  
Use natural, clean Hindi.  
Do NOT mix English words unless absolutely necessary.  
Do NOT use bullet points.  
Write in paragraph format.)

BOTH sections must cover:
- Personality & nature
- Emotional tendencies & thinking style
- Career & education direction
- Money tendencies & stability
- Relationships & family life
- Health tendencies (general lifestyle, not medical)
- 1–2 helpful suggestions for personal growth, balance & clarity

Tone:
- Positive but honest
- Supportive, not fatalistic
- Practical guidance, not predictions

Now produce the two sections:
`;
}

// Safe JSON reader
async function getBody(req) {
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = await getBody(req);
    const prompt = buildPrompt(body);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text() || "";

    // Cleanup
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
