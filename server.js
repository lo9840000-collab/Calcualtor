import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import vision from "@google-cloud/vision";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Temporary upload folder
const upload = multer({ dest: "uploads/" });

// Google Vision Client
const client = new vision.ImageAnnotatorClient({
  keyFilename: "keys/vision-key.json"  // path to your google key
});

// OCR API
app.post("/ocr", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, error: "No image uploaded" });
    }

    const path = req.file.path;

    // Google Vision OCR
    const [result] = await client.textDetection(path);

    // Remove temp file
    fs.unlink(path, () => {});

    const fullText = result.textAnnotations?.[0]?.description || "";

    // Extract numbers
    const numberMatches = fullText.match(/[-+]?\d*\.?\d+/g) || [];
    const numbers = numberMatches
      .map((n) => Number(n))
      .filter((n) => !isNaN(n));

    res.json({
      success: true,
      fullText,
      numbers
    });

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Test Route
app.get("/", (req, res) => {
  res.send("OCR Backend Running ✔");
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});