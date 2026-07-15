// Benchmark startup presentation for one giant file whose split view contains ~12k rows.
// Syntax highlighting is mocked here because highlight startup has its own benchmark; this script
// isolates the synchronous React/OpenTUI mount that must finish before Hunk can present the review.
import { mock } from "bun:test";

mock.module("../src/ui/diff/useHighlightedDiff", () => ({
  prefetchHighlightedDiff: async () => ({ deletionLines: [], additionLines: [] }),
  useHighlightedDiff: () => null,
}));

import { performance } from "node:perf_hooks";
import { testRender } from "@opentui/react/test-utils";
import React from "react";
import type { AppBootstrap } from "../src/core/types";
import { createGiantSingleDiffFile } from "./large-stream-fixture";
import { destroyRenderer, INTERACTION_VIEWPORT, renderPass } from "./lib/interaction";

const RENDERED_LINES = 12_000;

/** Build a patch-parsed giant file without paying Myers diff cost in the render measurement. */
function createSingleFileStartupBootstrap(): AppBootstrap {
  const file = createGiantSingleDiffFile(1, {
    linesPerFile: RENDERED_LINES,
    changedStartLine: 1,
    changedEndLine: RENDERED_LINES,
  });

  return {
    input: {
      kind: "vcs",
      staged: false,
      options: { mode: "auto" },
    },
    changeset: {
      id: `changeset:single-file-startup:${RENDERED_LINES}`,
      sourceLabel: "benchmark",
      title: "single-file startup",
      files: [file],
    },
    initialMode: "split",
    initialTheme: "midnight",
    initialShowAgentNotes: false,
  };
}

const { AppHost } = await import("../src/ui/AppHost");
const bootstrap = createSingleFileStartupBootstrap();
const presentationStart = performance.now();
const setup = await testRender(React.createElement(AppHost, { bootstrap }), INTERACTION_VIEWPORT);
const initialMountMs = performance.now() - presentationStart;

try {
  await renderPass(setup);
  console.log(
    `METRIC single_file_initial_presentation_ms=${(performance.now() - presentationStart).toFixed(2)}`,
  );
  console.log(`METRIC single_file_initial_mount_ms=${initialMountMs.toFixed(2)}`);
} finally {
  await destroyRenderer(setup);
}

console.log(`METRIC rendered_lines=${RENDERED_LINES}`);
console.log(`METRIC files=${bootstrap.changeset.files.length}`);
