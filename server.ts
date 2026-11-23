import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CritiqueRequestBody {
  fragranceName?: string;
  alchemistName?: string;
  pyramid?: { top: number; heart: number; base: number };
  dominantFamily?: string | null;
  dominantAccords?: { accord: string; weight: number }[];
  notes?: { name: string; layer: string; percentage: number }[];
  topMatch?: {
    name: string;
    house: string;
    similarityScore: number;
    sharedNotes: string[];
    sharedAccords: string[];
    keyDifferences: string[];
  } | null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "256kb" }));

  app.post("/api/critique", async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      res.status(503).json({
        error: "Editorial AI critique unavailable: GEMINI_API_KEY is not configured.",
        fallbackAvailable: true,
      });
      return;
    }

    const body = req.body as CritiqueRequestBody;
    if (!body || !Array.isArray(body.notes) || body.notes.length === 0) {
      res.status(400).json({ error: "A non-empty fragrance blend is required." });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const noteLines = body.notes
        .map((n) => `${n.name} (${n.layer}, ${n.percentage.toFixed(1)}%)`)
        .join("; ");
      const accordLines = (body.dominantAccords ?? [])
        .map((a) => `${a.accord} (${a.weight}%)`)
        .join(", ");
      const matchSummary = body.topMatch
        ? `Closest algorithmic reference match: ${body.topMatch.name} by ${body.topMatch.house} (${body.topMatch.similarityScore}% internal similarity estimate). Shared notes: ${body.topMatch.sharedNotes.join(", ") || "none"}. Shared accords: ${body.topMatch.sharedAccords.join(", ") || "none"}. Key differences: ${body.topMatch.keyDifferences.join("; ")}.`
        : "No reference match available.";

      const prompt = [
        `Compose a concise, sensory perfumery editorial critique (85-115 words, 2 short paragraphs) for a virtual fragrance composition.`,
        `Title: "${body.fragranceName || "Untitled Composition"}" by ${body.alchemistName || "Atelier Guest"}.`,
        `Olfactory family: ${body.dominantFamily || "Mixed"}.`,
        `Pyramid distribution: Top ${body.pyramid?.top ?? 0}%, Heart ${body.pyramid?.heart ?? 0}%, Base ${body.pyramid?.base ?? 0}%.`,
        `Virtual blend shares: ${noteLines}.`,
        `Dominant accords: ${accordLines || "Balanced"}.`,
        matchSummary,
        `Requirements: Reference ONLY the notes, proportions, and reference comparison provided above. Do not invent chemical lab tests, IFRA safety claims, longevity in hours, or brand endorsements. Keep the tone refined, tactile, and grounded.`,
      ].join("\n");

      const runCritique = async () =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: prompt,
          config: {
            systemInstruction:
              "You are a senior fragrance archivist and olfactory critic writing concise, sensory, strictly grounded evaluations of virtual perfume blends. Never fabricate real-world chemical stability, skin safety, or brand endorsements.",
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

      let response;
      try {
        response = await runCritique();
      } catch (firstErr) {
        const msg = firstErr instanceof Error ? firstErr.message : "";
        if (msg.includes("503") || msg.includes("429") || msg.includes("UNAVAILABLE")) {
          await new Promise((r) => setTimeout(r, 700));
          response = await runCritique();
        } else {
          throw firstErr;
        }
      }

      const text = response.text?.trim();
      if (!text) {
        res.status(502).json({ error: "Empty response returned from Gemini API." });
        return;
      }

      res.json({ critique: text, source: "ai" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate editorial critique.";
      const isBusy = message.includes("503") || message.includes("UNAVAILABLE");
      res.status(isBusy ? 503 : 500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Virtual Perfume Lab server listening on http://localhost:${PORT}`);
  });
}

startServer();
