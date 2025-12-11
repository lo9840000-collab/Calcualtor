// ---- REQUIRE MODULES ----
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const vision = require("@google-cloud/vision");

// ---- EXPRESS APP ----
const app = express();
app.use(cors());
app.use(express.json());

// ---- MEMORY STORAGE ----
const upload = multer({ storage: multer.memoryStorage() });

// ---- GOOGLE VISION KEY PATH ----
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// ---- VISION CLIENT ----
const client = new vision.ImageAnnotatorClient({
  keyFilename: CREDENTIALS_PATH,
});

// ---- SMART NUMERIC EXTRACTION ----
function extractDigitsSmart(text) {
  const matches = text.match(/\d+(\.\d+)?/g);
  return matches ? matches.map(n => Number(n)) : [];
}

// --------------------------------------
// ----------- OCR ENDPOINT -------------
// --------------------------------------
app.post("/ocr", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // HANDWRITING + PRINTED OCR
    const [result] = await client.textDetection(req.file.buffer);

    const annotations = result.textAnnotations || [];
    const fullText = annotations.length > 0 ? annotations[0].description : "";

    const numbers = extractDigitsSmart(fullText);

    let detectedTotal = null;
    if (numbers.length > 0) {
      detectedTotal = Math.max(...numbers);
    }

    res.json({
      fullText,
      numbers,
      sum: numbers.reduce((a, b) => a + b, 0),
      detectedTotal,
    });

  } catch (err) {
    console.error("OCR ERROR:", err);
    res.status(500).json({ error: "OCR processing failed" });
  }
});

// ---- HOME ROUTE ----
app.get("/", (req, res) => {
  res.send("OCR Backend Running ✔");
});

// ---- START SERVER ----
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server running on port", PORT));
