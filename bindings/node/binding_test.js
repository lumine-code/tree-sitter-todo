const assert = require("node:assert/strict");
const { test } = require("node:test");
const Parser = require("tree-sitter");
const TODO = require(".");

test("loads the grammar through the Node-API binding", () => {
  assert.equal(TODO.name, "TODO");
  assert.ok(TODO.language);
  assert.ok(Array.isArray(TODO.nodeTypeInfo));
});

require("../../test/suite.cjs")(() => {
  const parser = new Parser();
  parser.setLanguage(TODO);
  return parser;
});
