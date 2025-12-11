import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import vision from "@google-cloud/vision";
const express = require("express");
const multer = require("multer");
const vision = require("@google-cloud/vision");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Store uploaded image in RAM
const upload = multer({ storage: multer.memoryStorage() });

// GOOGLE VISION KEY LOCATION (Render secret file)
const CREDENTIALS_PATH =
  process.env.GOOGLE_APPLICATION_CREDENTIALS || "/etc/secrets/vision-key.json";

// Vision client
const client = new vision.ImageAnnotatorClient({
  keyFilename: CREDENTIALS_PATH,
});

// SMART NUMBER EXTRACTION (printed + handwritten)
function extractDigitsSmart(fullText) {
  if (!fullText) return [];

  // Remove weird characters, keep digits and punctuation
  const cleaned = fullText.replace(/[^\d.,\n ]+/g, " ");

  // Match numbers like:
  // 123, 45.67, 1,234.90
  const matches = cleaned.match(/\b\d[\d,]*\.?\d*\b/g) || [];

  return matches
    .map((n) => n.replace(/,/g, "")) // remove commas
    .map((n) => Number(n))
    .filter((n) => !isNaN(n));
}

// TEST ENDPOINT
app.get("/", (req, res) => {
  res.send("Handwritten OCR Backend is Running ✔");
});

// MAIN OCR ENDPOINT
app.post("/ocr", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, error: "No file uploaded" });
    }

    // Run Google Vision OCR
    const [result] = await client.documentTextDetection(req.file.buffer);

    const fullText = result.fullTextAnnotation?.text || "";

    // Extract numbers from full OCR text
    const numbers = extractDigitsSmart(fullText);

    return res.json({
      success: true,
      fullText,
      numbers,
      count: numbers.length,
      sum: numbers.reduce((a, b) => a + b, 0),
    });
  } catch (err) {
    console.error("OCR Error:", err);
    return res.json({
      success: false,
      error: err.message,
    });
  }
});

// SERVER START
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`OCR server running on port ${PORT}`));
