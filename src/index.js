import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

const dataDir = path.join(__dirname, "data");
import fs from "fs";
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "aya-ai.sqlite"));
db.exec(`
  CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL,
    prediction_id TEXT,
    output_url TEXT,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
const addGeneration = db.prepare(
  "INSERT INTO generations (kind,prompt,status,prediction_id,output_url,error) VALUES (?,?,?,?,?,?)"
);
const updateGeneration = db.prepare(
  "UPDATE generations SET status=?, output_url=?, error=? WHERE id=?"
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, configured: Boolean(process.env.REPLICATE_API_TOKEN) });
});

app.get("/api/history", (_req, res) => {
  const rows = db.prepare("SELECT * FROM generations ORDER BY id DESC LIMIT 100").all();
  res.json(rows);
});

function extractOutput(output) {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return output.find(x => typeof x === "string") || null;
  if (output && typeof output === "object") {
    for (const value of Object.values(output)) {
      if (typeof value === "string" && /^https?:\/\//.test(value)) return value;
      if (Array.isArray(value)) {
        const found = value.find(x => typeof x === "string" && /^https?:\/\//.test(x));
        if (found) return found;
      }
    }
  }
  return null;
}

async function replicatePrediction(model, input) {
  if (!process.env.REPLICATE_API_TOKEN) {
    const error = new Error("أضيفي REPLICATE_API_TOKEN في ملف .env لتفعيل التوليد الحقيقي.");
    error.status = 503;
    throw error;
  }
  const [owner, name] = model.split("/");
  if (!owner || !name) throw new Error("اسم نموذج Replicate غير صحيح.");
  const response = await fetch(
    `https://api.replicate.com/v1/models/${owner}/${name}/predictions`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        "Prefer": "wait"
      },
      body: JSON.stringify({ input })
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.title || "تعذر الاتصال بمحرك التوليد.");
  return data;
}

app.post("/api/generate", async (req, res) => {
  const { kind, prompt, aspectRatio = "9:16", duration = 5 } = req.body || {};
  if (!["image", "video"].includes(kind)) return res.status(400).json({ error: "نوع التوليد غير صحيح." });
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
    return res.status(400).json({ error: "اكتبي وصفاً واضحاً قبل التوليد." });
  }

  const enhancedPrompt = `${prompt.trim()}, cinematic lighting, highly detailed, professional quality, natural realistic textures`;
  const row = addGeneration.run(kind, prompt.trim(), "starting", null, null, null);
  try {
    const model = kind === "image"
      ? (process.env.REPLICATE_IMAGE_MODEL || "openai/gpt-image-2.6-sunburst")
      : (process.env.REPLICATE_VIDEO_MODEL || "kwaivgi/kling-v4-flash");

    // Model inputs can vary. These defaults are intentionally kept small and configurable.
    const input = kind === "image"
      ? { prompt: enhancedPrompt, aspect_ratio: aspectRatio }
      : { prompt: enhancedPrompt, duration: Number(duration) };

    const prediction = await replicatePrediction(model, input);
    const outputUrl = extractOutput(prediction.output);
    updateGeneration.run(prediction.status || "processing", outputUrl, prediction.error || null, row.lastInsertRowid);
    res.json({
      id: row.lastInsertRowid,
      predictionId: prediction.id,
      status: prediction.status || "processing",
      outputUrl,
      message: prediction.status === "succeeded" ? "اكتمل التوليد." : "بدأ التوليد. يمكنك تحديث المعرض بعد قليل."
    });
  } catch (error) {
    updateGeneration.run("failed", null, error.message, row.lastInsertRowid);
    res.status(error.status || 502).json({ error: error.message });
  }
});

const clientDist = path.resolve(__dirname, "../dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Aya AI server listening on ${port}`));
