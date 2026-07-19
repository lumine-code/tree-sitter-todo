const assert = require("node:assert");
const { test } = require("node:test");
const TODO = require(".");

test("loads the grammar through the Node-API binding", () => {
  assert.strictEqual(TODO.name, "TODO");
  assert.ok(TODO.language);
  assert.ok(Array.isArray(TODO.nodeTypeInfo));
});
