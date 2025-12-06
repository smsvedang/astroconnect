// server.js
// Backend for AstroConnect – Gemini AI + Pincode → City/State

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Gemini Setup ----
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY is not set in .env");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "DUMMY_KEY");
const model = GEMINI_API_KEY
  ? genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  : null;

// ---- Middlewares ----
app.use(cors());
app.use(express.json());

// Static files (frontend)
app.use(express.static(path.join(__dirname, "public")));

// ---- Helper: prompt builder for Gemini ----
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
- Do NOT mention that you are an AI or language model.

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

// ---- 1) Pincode → City/State lookup API ----
app.get("/api/pincode/:pin", async (req, res) => {
  try {
    const pin = (req.params.pin || "").trim();

    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({ error: "Invalid PIN code format" });
    }

    const url = `https://api.postalpincode.in/pincode/${pin}`;

    // Node 22+ has global fetch
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Postal API error");
    }

    const data = await response.json();

    if (!Array.isArray(data) || !data[0] || data[0].Status !== "Success") {
      return res.status(404).json({ error: "No data found for this PIN" });
    }

    const office = data[0].PostOffice && data[0].PostOffice[0];
    if (!office) {
      return res.status(404).json({ error: "No Post Office found for PIN" });
    }

    const city = office.District;
    const state = office.State;
    const country = "India";

    res.json({
      pin,
      city,
      state,
      country
    });
  } catch (err) {
    console.error("Pincode lookup error:", err);
    res.status(500).json({ error: "Failed to lookup pincode" });
  }
});

// ---- 2) Astro description API (Gemini) ----
app.post("/api/astro", async (req, res) => {
  try {
    if (!model || !GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API is not configured. Set GEMINI_API_KEY in .env"
      });
    }

    const data = req.body;

    if (!data.name || !data.dob || !data.tob || !data.city) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = buildPrompt(data);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ description: text });
  } catch (err) {
    console.error("Gemini error:", err);
    res.status(500).json({
      error: "Failed to generate description. Please try again later."
    });
  }
});

// ---- Fallback: serve index.html for any other route ----
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---- Start server ----
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
