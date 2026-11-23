import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { FRAGRANCE_NOTES } from "./src/data/catalog";
import { getCatalogRepository } from "./src/server/catalogRepository";
import type {
  AdminImportRecordInput,
  BlendSelection,
  DataCompletenessStatus,
} from "./src/types/fragrance";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MatchRequestBody {
  selection?: BlendSelection;
  limit?: number;
}

interface CritiqueRequestBody {
  locale?: "en" | "fa";
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
    confidenceScore?: number;
    matchTier?: string;
    sharedNotes: string[];
    sharedAccords: string[];
    keyDifferences: string[];
    completeness?: string;
  } | null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize indexed reference catalog once at startup
  const catalogRepo = getCatalogRepository();
  console.log(
    `Loaded reference catalog: ${catalogRepo.getPerfumeCount()} perfumes (${catalogRepo.getStats().totalMaterials} canonical materials)`
  );

  app.use(express.json({ limit: "1mb" }));

  // Public summary for Landing / Footer transparency (never ships full catalog to browser)
  app.get("/api/catalog/summary", (_req: Request, res: Response) => {
    const stats = catalogRepo.getStats();
    res.json({
      stats,
      attribution: {
        name: "Scento",
        url: "https://www.scento.com/perfume-database",
        license: "CC BY 4.0",
      },
    });
  });

  // Dynamic server-side similarity matching across the full indexed catalog
  app.post("/api/match", (req: Request, res: Response) => {
    const body = req.body as MatchRequestBody;
    if (!body || !body.selection || typeof body.selection !== "object") {
      res.status(400).json({ error: "A valid blend selection object is required." });
      return;
    }

    const sanitizedSelection: BlendSelection = {};
    for (const [noteId, rawCount] of Object.entries(body.selection)) {
      const count = Number(rawCount);
      if (Number.isFinite(count) && count > 0) {
        sanitizedSelection[noteId] = Math.min(200, Math.floor(count));
      }
    }

    if (Object.keys(sanitizedSelection).length === 0) {
      res.status(400).json({ error: "Select at least one fragrance note before matching." });
      return;
    }

    const limit = typeof body.limit === "number" ? body.limit : 8;
    const response = catalogRepo.match(sanitizedSelection, FRAGRANCE_NOTES, { limit });
    res.json(response);
  });

  // Admin catalog stats & paginated browser
  app.get("/api/admin/catalog", (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 15);
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const source = typeof req.query.source === "string" ? req.query.source : "";
    const rawComp = typeof req.query.completeness === "string" ? req.query.completeness : "all";
    const completeness: DataCompletenessStatus | "all" =
      rawComp === "complete" || rawComp === "partial" || rawComp === "minimal"
        ? rawComp
        : "all";

    const result = catalogRepo.queryCatalog({
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 15,
      q,
      source,
      completeness,
    });
    res.json(result);
  });

  // Incremental runtime catalog expansion
  app.post("/api/admin/import", (req: Request, res: Response) => {
    const body = req.body as { records?: AdminImportRecordInput[] };
    if (!body || !Array.isArray(body.records) || body.records.length === 0) {
      res.status(400).json({ error: "Provide a non-empty 'records' array of perfume objects." });
      return;
    }
    if (body.records.length > 500) {
      res.status(400).json({ error: "Batch size limited to 500 records per request." });
      return;
    }

    const result = catalogRepo.upsertPerfumes(body.records, { persist: true });
    res.json(result);
  });

  // Grounded AI interpretation layer (never invents perfumes or unverified claims)
  app.post("/api/critique", async (req: Request, res: Response) => {
    const body = req.body as CritiqueRequestBody;
    if (!body || !Array.isArray(body.notes) || body.notes.length === 0) {
      res.status(400).json({ error: "A non-empty fragrance blend is required." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      res.json({
        critique: null,
        source: "deterministic",
        unavailable: true,
        reason: "Editorial AI critique unavailable: GEMINI_API_KEY is not configured.",
      });
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
        ? `Closest deterministic catalog match: ${body.topMatch.name} by ${body.topMatch.house} (${body.topMatch.similarityScore}% algorithmic estimate; tier: ${body.topMatch.matchTier ?? "exploratory"}; catalog completeness: ${body.topMatch.completeness ?? "complete"}). Shared notes: ${body.topMatch.sharedNotes.join(", ") || "none"}. Shared accords: ${body.topMatch.sharedAccords.join(", ") || "none"}. Key differences: ${body.topMatch.keyDifferences.join("; ")}.`
        : "No close reference match reached threshold in the catalog.";

      const isPersian = body.locale === "fa";
      const prompt = [
        isPersian
          ? `Compose a concise, sensory perfumery editorial critique in refined Persian (فارسی, 85-115 words, 2 short paragraphs) for a virtual fragrance composition. Keep any official commercial perfume names and perfume house names in their original Latin spelling.`
          : `Compose a concise, sensory perfumery editorial critique (85-115 words, 2 short paragraphs) for a virtual fragrance composition.`,
        `Title: "${body.fragranceName || "Untitled Composition"}" by ${body.alchemistName || "Atelier Guest"}.`,
        `Olfactory family: ${body.dominantFamily || "Mixed"}.`,
        `Pyramid distribution: Top ${body.pyramid?.top ?? 0}%, Heart ${body.pyramid?.heart ?? 0}%, Base ${body.pyramid?.base ?? 0}%.`,
        `Virtual blend shares: ${noteLines}.`,
        `Dominant accords: ${accordLines || "Balanced"}.`,
        matchSummary,
        `Strict grounding requirements: ONLY reference the user's exact notes, proportions, and the single deterministic reference match provided above. Do NOT name any other commercial perfumes, invent similarity percentages, fabricate chemical/IFRA safety claims, estimate wear-time in hours, or imply brand endorsement. Keep the tone refined, tactile, and grounded.`,
      ].join("\n");

      const runCritique = async () =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: prompt,
          config: {
            systemInstruction:
              "You are a senior fragrance archivist interpreting deterministic perfumery lab outputs. Never introduce commercial perfume names not supplied in the prompt, never invent similarity scores, and never fabricate chemical stability, longevity hours, or skin safety claims.",
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
        res.json({
          critique: null,
          source: "deterministic",
          unavailable: true,
          reason: "Empty response returned from Gemini API.",
        });
        return;
      }

      res.json({ critique: text, source: "ai" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate editorial critique.";
      res.json({
        critique: null,
        source: "deterministic",
        unavailable: true,
        reason: message,
      });
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
