import "server-only"

import path from "node:path"

/** Every runtime knob in one place. All of them come from environment variables. */
export const config = {
  dataDir: path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || path.join(process.cwd(), "data")),
  password: process.env.CVFREE_PASSWORD || "",
  /** Where the headless browser reaches the app to print PDFs. */
  internalUrl: (process.env.INTERNAL_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/$/, ""),
  chromePath: process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || "",
  ai: {
    baseUrl: (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    apiKey: process.env.AI_API_KEY || "",
    model: process.env.AI_MODEL || "",
  },
  version: process.env.APP_VERSION || "0.1.0",
}

export function aiEnabled() {
  return Boolean(config.ai.model && (config.ai.apiKey || !config.ai.baseUrl.includes("openai.com")))
}
