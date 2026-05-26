#!/usr/bin/env node
/**
 * resolve-merge-conflicts.mjs
 *
 * Reads docs/merge-upstream-policy.md and uses Claude API to resolve
 * Git merge conflicts in all conflicted files.
 *
 * Required env: ANTHROPIC_API_KEY
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
const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 3000;
const MAX_FILE_BYTES = 80_000; // skip files larger than this

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sh(cmd) {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripFences(text) {
  // Claude sometimes wraps output in ```lang ... ```
  const trimmed = text.trimStart();
  if (trimmed.startsWith("```")) {
    const firstNewline = trimmed.indexOf("\n");
    const lastFence = trimmed.lastIndexOf("```");
    if (lastFence > firstNewline) {
      return trimmed.slice(firstNewline + 1, lastFence).trimEnd();
    }
  }
  return text;
}

// ---------------------------------------------------------------------------
// Claude API
// ---------------------------------------------------------------------------

async function resolveWithClaude(filename, content, policy) {
  const prompt = `You are a merge-conflict resolver. You MUST follow the merge policy below exactly.

## Merge Policy

${policy}

## Task

File: \`${filename}\`

Below is the file content with Git conflict markers. Resolve ALL markers following the policy.

Rules:
- Remove every <<<<<<< HEAD / ======= / >>>>>>> upstream/main line.
- When the policy says "Keep OURS" → use the HEAD side.
- When the policy says "Keep THEIRS" / "Adopt Upstream" → use the upstream/main side.
- When the policy says "Keep BOTH" → merge the meaningful parts from both sides into one coherent result.
- For conflicts not covered by the policy, prefer upstream for bug-fixes, keep ours for custom features.
- Preserve the file's existing style, indentation, and formatting.

Output ONLY the resolved file content. No explanations, no markdown fences, no commentary.

## File content with conflict markers:

${content}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 16384,
          temperature: 0,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`API ${response.status}: ${errBody.slice(0, 200)}`);
      }

      const data = await response.json();

      if (data.stop_reason === "max_tokens") {
        throw new Error("Response truncated (max_tokens reached)");
      }

      let resolved = data.content?.[0]?.text;
      if (!resolved) throw new Error("Empty response from Claude");

      resolved = stripFences(resolved);
      return resolved;
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
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("✗ ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  const policy = await readFile(POLICY_PATH, "utf-8");

  const raw = sh("git diff --name-only --diff-filter=U");
  if (!raw) {
    console.log("No conflicted files — nothing to resolve.");
    return;
  }

  const files = raw.split("\n").filter(Boolean);
  console.log(`Found ${files.length} conflicted file(s)\n`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const content = await readFile(file, "utf-8");

    // Skip files without actual conflict markers
    if (!content.includes("<<<<<<< HEAD")) {
      console.log(`  ⊘ skip (no markers): ${file}`);
      skipped++;
      continue;
    }

    // Skip very large files
    if (Buffer.byteLength(content, "utf-8") > MAX_FILE_BYTES) {
      console.log(`  ⊘ skip (too large): ${file}`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`  🔧 ${file} … `);
      const resolved = await resolveWithClaude(file, content, policy);

      // Quick sanity check
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

  console.log(`\n── Summary: ${ok} resolved, ${skipped} skipped, ${failed} failed ──`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
