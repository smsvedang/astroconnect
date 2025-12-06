// api/astro.js  (ESM – because "type": "module" in package.json)
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Prompt builder
function buildPrompt(data) {
  const {
    name,
    gender,
    dob,
    tob,
    city,
    state,
    pincode,
    country,
    notes,
    zodiac,
    lifePath
  } = data;

  return `
You are an experienced Vedic astrologer and counsellor.
User has filled birth details on a website. 
Give a clear, structured reading in a friendly tone.

IMPORTANT:
- This is guidance only, NOT medical, financial, or legal advice.
- Be gentle, practical, and avoid fear-based predictions.
- Do NOT mention anything about being a model or AI, just speak like a human astrologer.

User birth data:
- Name: ${name}
- Gender: ${gender}
- Date of Birth (YYYY-MM-DD): ${dob}
- Time of Birth (HH:MM, 24h): ${tob}
- Birth Place: ${city}, ${state}, ${country} (${pincode})
- Sun sign (approx, from DOB): ${zodiac}
- Simple life path number: ${lifePath}
- User concern / question: ${notes || "Not specifically mentioned"}

Write the answer in 2 languages:

[ENGLISH]
1. Overview of personality (based on sign and general astrological style)
2. Strengths & talents
3. Challenges or patterns to watch
4. Career/Studies indication (general – no fake guarantees)
5. Relationships & emotional pattern
6. Practical guidance & remedies (very simple, like routine, mindset, etc.)

[हिन्दी]
1. व्यक्तित्व की झलक
2. आपकी खास ताकतें
3. चुनौतियाँ / पैटर्न
4. करियर / पढ़ाई के संकेत (सामान्य रूप से)
5. रिश्ते और भावनाएँ
6. सरल प्रैक्टिकल सुझाव और सावधानियाँ

Avoid very specific dated predictions (like “on 12 March 2030…”).
Keep it supportive, realistic and 100% non-fearful.
`;
}

// Vercel API Route – default export
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not set on server" });
    }

    const body = req.body || {};

    if (!body.name || !body.dob || !body.tob || !body.city) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = buildPrompt(body);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ description: text });
  } catch (err) {
    console.error("astro API error:", err);
    return res.status(500).json({
      error: "Failed to generate description. Please try again later."
    });
  }
}
