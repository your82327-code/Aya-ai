
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    imageConfigured: Boolean(process.env.REPLICATE_IMAGE_MODEL),
    videoConfigured: Boolean(process.env.REPLICATE_VIDEO_MODEL),
    tokenConfigured: Boolean(process.env.REPLICATE_API_TOKEN)
  });
});

app.post("/api/generate", async (req, res) => {
  const { kind, prompt, aspectRatio = "9:16", duration = 5 } = req.body || {};

  if (!["image", "video"].includes(kind)) {
    return res.status(400).json({ error: "نوع التوليد غير صحيح." });
  }

  if (typeof prompt !== "string" || prompt.trim().length < 3) {
    return res.status(400).json({ error: "اكتبي وصفاً واضحاً." });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  const model = kind === "image"
    ? process.env.REPLICATE_IMAGE_MODEL
    : process.env.REPLICATE_VIDEO_MODEL;

  if (!token || !model) {
    return res.status(503).json({
      error: "يجب إعداد مفتاح Replicate واسم نموذج التوليد أولاً."
    });
  }

  try {
    const input = kind === "image"
      ? { prompt: prompt.trim(), aspect_ratio: aspectRatio }
      : { prompt: prompt.trim(), duration: Number(duration) };

    const response = await fetch(
      `https://api.replicate.com/v1/models/${model}/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait"
        },
        body: JSON.stringify({ input })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.detail || data.title || "حدث خطأ أثناء التوليد."
      });
    }

    res.json({
      id: data.id,
      status: data.status,
      output: data.output || null,
      message: "تم إرسال طلب التوليد."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/predictions/:id", async (req, res) => {
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    return res.status(503).json({ error: "مفتاح Replicate غير موجود." });
  }

  try {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${req.params.id}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.detail || "تعذر جلب نتيجة التوليد."
      });
    }

    res.json({
      id: data.id,
      status: data.status,
      output: data.output || null,
      error: data.error || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const clientDist = path.resolve(__dirname, "../dist");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Aya AI server running on port ${port}`);
});
          
