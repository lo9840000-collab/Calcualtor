// ------------------------------
// CLEAN WORKING SERVER (v5.3.0)
// ------------------------------

import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import visionLib from "@google-cloud/vision";

const app = express();
app.use(cors());
app.use(express.json());

// Multer: store uploaded image in RAM
const upload = multer({ storage: multer.memoryStorage() });

// Google Vision credentials (Render secret file)
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Vision client (v5 syntax)
const client = new visionLib.ImageAnnotatorClient({
  keyFilename: CREDENTIALS_PATH,
});

// Extract smart digits (printed + handwritten)
function extractDigitsSmart(fullText) {
  const matches = fullText.match(/\d+(\.\d+)?/g);
  return matches ? matches.map(n => Number(n)) : [];
}

// =======================
// MAIN OCR ENDPOINT
// =======================
app.post("/ocr", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, error: "No file uploaded" });
    }

    // Use Vision API
    const [result] = await client.documentTextDetection(req.file.buffer);

    const fullText = result.fullTextAnnotation?.text || "";
    const numbers = extractDigitsSmart(fullText);

    // Attempt to extract grand total
    let detectedTotal = null;
    const totalRegex = /(grand[\s-]*total|total)\D{0,10}(\d[\d,\.]+)/i;
    const match = fullText.match(totalRegex);

    if (match) {
      detectedTotal = Number(match[2].replace(/,/g, ""));
    }

    res.json({
      success: true,
      fullText,
      numbers,
      detectedTotal,
    });

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// =======================
// SERVER START
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("OCR server running on", PORT);
});
