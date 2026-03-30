#!/usr/bin/env node

/**
 * TRAIL Protocol - DID Document Validation CLI
 *
 * Usage:
 *   node validation/validate.js validation/fixtures/valid-did-document.json
 */

const fs = require("fs");
const path = require("path");
const { validateDidDocument } = require("./did-document-validator");

function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("Usage: node validation/validate.js <path-to-did-document.json>");
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);

  let raw;
  try {
    raw = fs.readFileSync(absolutePath, "utf8");
  } catch (error) {
    console.error(`Failed to read file: ${absolutePath}`);
    console.error(error.message);
    process.exit(1);
  }

  let document;
  try {
    document = JSON.parse(raw);
  } catch (error) {
    console.error("Invalid JSON:");
    console.error(error.message);
    process.exit(1);
  }

  const result = validateDidDocument(document);

  if (result.valid) {
    console.log("VALID: DID Document conforms to current TRAIL validation rules.");
    process.exit(0);
  }

  console.log(`INVALID: ${result.errors.length} validation error(s)`);
  result.errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error}`);
  });

  process.exit(2);
}

main();