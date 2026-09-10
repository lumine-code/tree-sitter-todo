const assert = require("node:assert");
const { test } = require("node:test");
const Parser = require("tree-sitter");
const TODO = require(".");

test("loads the grammar through the Node-API binding", () => {
  assert.strictEqual(TODO.name, "TODO");
  assert.ok(TODO.language);
  assert.ok(Array.isArray(TODO.nodeTypeInfo));
});

test("excludes CRLF line endings from TODO body text and end positions", () => {
  const parser = new Parser();
  parser.setLanguage(TODO);

  const tree = parser.parse("TODO body\r\nFIXME\r\n");
  const todos = tree.rootNode.descendantsOfType("todo");
  const bodies = tree.rootNode.descendantsOfType("todo_body");

  assert.deepStrictEqual(
    todos.map((todo) => todo.text),
    ["TODO body", "FIXME"],
  );
  assert.deepStrictEqual(
    bodies.map((body) => body.text),
    [" body"],
  );
  assert.deepStrictEqual(
    todos.map((todo) => [todo.endPosition.row, todo.endPosition.column]),
    [
      [0, 9],
      [1, 5],
    ],
  );
});
