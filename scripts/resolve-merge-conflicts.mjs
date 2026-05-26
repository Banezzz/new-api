#!/usr/bin/env node
/**
 * resolve-merge-conflicts.mjs
 *
 * Reads docs/merge-upstream-policy.md and uses an LLM (OpenAI Chat Completions
 * compatible API) to resolve Git merge conflicts in all conflicted files.
 *
 * Required env:
 *   LLM_API_KEY  — your API key
 *
 * Optional env (defaults point at DeepSeek):
 *   LLM_API_URL  — full endpoint URL
 *   LLM_MODEL    — model name
 *
 * Exit codes:
 *   0 — all conflicts resolved successfully
 *   1 — fatal error or some files could not be resolved
 */

import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const POLICY_PATH = "docs/merge-upstream-policy.md";

const API_URL = process.env.LLM_API_URL || "https://api.deepseek.com/v1/chat/completions";
const MODEL   = process.env.LLM_MODEL   || "deepseek-chat";
const API_KEY = process.env.LLM_API_KEY;

const MAX_RETRIES    = 2;
const RETRY_BASE_MS  = 3000;
const MAX_FILE_BYTES = 80_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sh(cmd) {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripFences(text) {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("```")) {
    const nl = trimmed.indexOf("\n");
    const last = trimmed.lastIndexOf("```");
    if (last > nl) return trimmed.slice(nl + 1, last).trimEnd();
  }
  return text;
}

// ---------------------------------------------------------------------------
// LLM API (OpenAI Chat Completions format)
// ---------------------------------------------------------------------------

async function resolveWithLLM(filename, content, policy) {
  const prompt = `You are a merge-conflict resolver. Follow the merge policy exactly.

## Merge Policy

${policy}

## Task — file: \`${filename}\`

Below is the file content with Git conflict markers (<<<<<<< HEAD / ======= / >>>>>>> upstream/main).
Resolve ALL markers following the policy.

- Remove every conflict marker line.
- "Keep OURS" → use HEAD side. "Keep THEIRS" / "Adopt Upstream" → use upstream/main side.
- "Keep BOTH" → merge meaningful parts from both sides into one coherent result.
- When not covered by the policy: prefer upstream for bug-fixes, keep ours for custom features.
- Preserve existing style, indentation, and formatting.

Output ONLY the resolved file content. No explanations, no markdown fences.

## File content:

${content}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 16384,
          temperature: 0,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`API ${res.status}: ${err.slice(0, 200)}`);
      }

      const data = await res.json();

      if (data.choices?.[0]?.finish_reason === "length") {
        throw new Error("Response truncated — increase max_tokens");
      }

      let resolved = data.choices?.[0]?.message?.content;
      if (!resolved) throw new Error("Empty response");

      return stripFences(resolved);
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        console.log(`  ↻ retry ${attempt + 1}/${MAX_RETRIES}: ${err.message}`);
        await sleep(RETRY_BASE_MS * (attempt + 1));
      } else {
        throw err;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!API_KEY) {
    console.error("✗ LLM_API_KEY not set");
    process.exit(1);
  }

  console.log(`API:  ${API_URL}`);
  console.log(`Model: ${MODEL}\n`);

  const policy = await readFile(POLICY_PATH, "utf-8");

  const raw = sh("git diff --name-only --diff-filter=U");
  if (!raw) {
    console.log("No conflicted files — nothing to resolve.");
    return;
  }

  const files = raw.split("\n").filter(Boolean);
  console.log(`Found ${files.length} conflicted file(s)\n`);

  let ok = 0, skipped = 0, failed = 0;

  for (const file of files) {
    const content = await readFile(file, "utf-8");

    if (!content.includes("<<<<<<< HEAD")) {
      console.log(`  ⊘ skip (no markers): ${file}`);
      skipped++;
      continue;
    }

    if (Buffer.byteLength(content, "utf-8") > MAX_FILE_BYTES) {
      console.log(`  ⊘ skip (too large): ${file}`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`  🔧 ${file} … `);
      const resolved = await resolveWithLLM(file, content, policy);

      if (resolved.includes("<<<<<<< HEAD")) {
        throw new Error("Resolution still contains conflict markers");
      }

      await writeFile(file, resolved, "utf-8");
      sh(`git add -- "${file}"`);
      console.log("✓");
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      failed++;
    }
  }

  console.log(`\n── ${ok} resolved, ${skipped} skipped, ${failed} failed ──`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
