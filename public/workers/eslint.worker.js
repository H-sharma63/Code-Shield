/* eslint-env worker */

// IMPORTANT: This worker is a simplified version and uses a generic set of ESLint rules.
// It does not use the exact same rules as your project's ESLint configuration.

import { Linter, SourceCode } from "eslint-linter-browserify";

const linter = new Linter();

// A basic set of rules, you can extend this
const config = {
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    // Add some basic rules
    "no-unused-vars": "error",
    "no-undef": "error",
  },
};

self.onmessage = (event) => {
  const { code, version } = event.data;
  if (!code) {
    self.postMessage({ markers: [], version });
    return;
  }

  try {
    const messages = linter.verify(code, config);
    const markers = messages.map((msg) => ({
      startLineNumber: msg.line,
      endLineNumber: msg.line,
      startColumn: msg.column,
      endColumn: msg.column,
      message: msg.message,
      severity: msg.severity === 2 ? 8 : 4, // Error: 8, Warning: 4
      source: "ESLint",
    }));

    self.postMessage({ markers, version });
  } catch (e) {
    // Ignore parsing errors, the editor will show them
    self.postMessage({ markers: [], version });
  }
};
