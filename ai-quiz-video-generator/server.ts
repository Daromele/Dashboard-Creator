import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5";
const PORT = Number(process.env.PORT) || 3000;

/**
 * Minimal .env loader so `npm run dev` picks up ANTHROPIC_API_KEY without an
 * extra dependency. Existing environment variables always win.
 */
function loadEnvFile(file: string) {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

type ClaudeRequest = {
  system?: string;
  prompt: string;
  /** JSON Schema describing the expected response. Omit for free-form text. */
  schema?: Record<string, unknown>;
  /** Let Claude search the web before answering. */
  useWebSearch?: boolean;
  maxTokens?: number;
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key from console.anthropic.com."
    );
  }
  if (!client) client = new Anthropic();
  return client;
}

async function callClaude(body: ClaudeRequest) {
  const anthropic = getClient();
  const { system, prompt, schema, useWebSearch, maxTokens = 4096 } = body;

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw Object.assign(new Error("`prompt` is required."), { statusCode: 400 });
  }

  const request: Anthropic.MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (system) request.system = system;

  if (useWebSearch) {
    // Web search and structured outputs are not combined here: when searching we
    // ask for JSON in the prompt and parse it client-side.
    request.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }];
  } else if (schema) {
    request.output_config = { format: { type: "json_schema", schema } };
  }

  const response = await anthropic.messages.create(request);

  if (response.stop_reason === "refusal") {
    // `stop_details` is only populated on refusals and is newer than the SDK's types.
    const explanation = (response as any).stop_details?.explanation;
    throw Object.assign(
      new Error(`Claude declined this request${explanation ? `: ${explanation}` : "."}`),
      { statusCode: 422 }
    );
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  // Surface the pages Claude consulted so the UI can credit its sources.
  const sources: { uri: string; title: string }[] = [];
  for (const block of response.content) {
    if (block.type !== "web_search_tool_result") continue;
    // On error, `content` is a single error object rather than a list of results.
    if (!Array.isArray(block.content)) continue;
    for (const result of block.content) {
      if (result.type === "web_search_result") {
        sources.push({ uri: result.url, title: result.title || result.url });
      }
    }
  }

  return { text, sources };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

  app.post("/api/claude", async (req, res) => {
    try {
      res.json(await callClaude(req.body as ClaudeRequest));
    } catch (error: any) {
      const status = error?.statusCode ?? error?.status ?? 500;
      console.error("Claude API error:", error?.message ?? error);
      res.status(status).json({ error: error?.message ?? "Unknown error" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Express 5 / path-to-regexp v8 rejects a bare "*" route; use a named splat.
    app.get("/*splat", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("WARNING: ANTHROPIC_API_KEY is not set - AI features will fail.");
    }
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
