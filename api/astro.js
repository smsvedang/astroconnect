// api/astro.js
// Vercel / Next.js style serverless (ESM)
// Uses @google/generative-ai

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is missing in environment.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Use latest fast model; if this fails on your key, change to "gemini-2.0-flash"
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

VERY IMPORTANT: OUTPUT FORMAT (MUST FOLLOW EXACTLY)

1) Your answer MUST have exactly two sections in this order:

[ENGLISH]
(detailed explanation in English, using English alphabet)

[HINGLISH]
(same explanation in Hindi meaning, BUT written only in English alphabet / Roman Hindi.
Do NOT use any Hindi/Devanagari characters like क, म, ि, ा, etc. 
Example style: "Aapka swabhav shant hai, aur aap mehnati insan ho.")

2) In BOTH sections (English and Hinglish), cover:
- Personality and nature
- Emotional pattern and thinking
- Education and career possibilities
- Money and stability tendencies
- Relationships and family tone
- General health tendencies (no medical advice, just lifestyle)
- 1–2 gentle suggestions / mindset / gratitude / habits

3) DO NOT:
- use bullet points or numbered lists
- use asterisks (*), underscores (_) or markdown headings
- mix English and Hinglish in the same section
- put Hindi/Devanagari letters in the [HINGLISH] section (it MUST be pure Roman Hindi)

4) TONE:
- kind, practical, non-scary
- talk in possibilities and tendencies, not fixed destiny

Now generate the answer in the format:

[ENGLISH]
...your English paragraphs...

[HINGLISH]
...your Hinglish paragraphs, Hindi meaning written in English letters only...
`;
}

// Helper: read JSON body safely
async function getBody(req) {
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  return JSON.parse(raw);
}

export default async function handler(req, res) {
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
