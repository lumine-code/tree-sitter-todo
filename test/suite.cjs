const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  edit,
  snapshot,
  parserFor,
  parse,
  logCounts,
  ranges,
} = require("./helpers.cjs");

module.exports = function registerTests(create) {
  test("recognizes every standalone marker and excludes identifier suffixes", (t) => {
    const parser = parserFor(t, create);
    const names = [
      "TODO",
      "FIXME",
      "CHANGED",
      "XXX",
      "IDEA",
      "HACK",
      "NOTE",
      "REVIEW",
      "NB",
      "BUG",
      "QUESTION",
      "COMBAK",
      "TEMP",
      "DEBUG",
      "OPTIMIZE",
      "WARNING",
    ];
    const source = names.join("\n");
    const tree = parse(t, parser, source);
    assert.deepEqual(
      tree.rootNode.descendantsOfType("todo_token").map((node) => node.text),
      names,
    );
    for (const identifier of [
      "FoTODO",
      "FOoTODO",
      "TODO1TODO",
      "TODO_TODO",
      "FIXME2BUG",
      "xTODO",
      "helloTODO",
      "TODOF",
      "TODO1",
      "TODO_",
      `${"A".repeat(20000)}TODO`,
      `${"a".repeat(4095)}TODO`,
    ]) {
      const invalid = parse(t, parser, `TODO valid\n${identifier}: invalid`);
      assert.deepEqual(
        invalid.rootNode.descendantsOfType("todo").map((node) => node.text),
        ["TODO valid"],
        identifier,
      );
    }
  });

  test("excludes CRLF endings from bodies and node positions", (t) => {
    const parser = parserFor(t, create);
    const tree = parse(t, parser, "TODO body\r\nFIXME\r\nNOTE last\n");
    const todos = tree.rootNode.descendantsOfType("todo");
    assert.deepEqual(
      todos.map((node) => node.text),
      ["TODO body", "FIXME", "NOTE last"],
    );
    assert.deepEqual(
      tree.rootNode.descendantsOfType("todo_body").map((node) => node.text),
      [" body", " last"],
    );
    assert.deepEqual(
      todos.map((node) => [node.endPosition.row, node.endPosition.column]),
      [
        [0, 9],
        [1, 5],
        [2, 9],
      ],
    );
  });

  test("preserves NUL characters in ordinary text and TODO bodies", (t) => {
    const parser = parserFor(t, create);
    const tree = parse(t, parser, "\0text\0 TODO a\0b\r\nFIXME\0last\0");
    assert.deepEqual(
      tree.rootNode.descendantsOfType("todo").map((node) => node.text),
      ["TODO a\0b", "FIXME\0last\0"],
    );
    assert.deepEqual(
      tree.rootNode.descendantsOfType("todo_body").map((node) => node.text),
      [" a\0b", "\0last\0"],
    );
    const empty = parse(t, parser, "");
    assert.equal(empty.rootNode.descendantsOfType("todo").length, 0);
  });

  test("does not join markers or bodies across disjoint included ranges", (t) => {
    const parser = parserFor(t, create);
    const source = "// TODO first\ncode here\n// FIXME second";
    const tree = parse(t, parser, source, null, {
      includedRanges: ranges(source, ["TODO first", "FIXME second"]),
    });
    assert.deepEqual(
      tree.rootNode.descendantsOfType("todo").map((node) => node.text),
      ["TODO first", "FIXME second"],
    );
    const adjacentMarkers = "// TODO\n// FIXME";
    const markers = parse(t, parser, adjacentMarkers, null, {
      includedRanges: ranges(adjacentMarkers, ["TODO", "FIXME"]),
    });
    assert.deepEqual(
      markers.rootNode.descendantsOfType("todo_token").map((node) => node.text),
      ["TODO", "FIXME"],
    );
    assert.equal(markers.rootNode.descendantsOfType("todo_body").length, 0);
    const fragment = "// TO\n// DO";
    const fragments = parse(t, parser, fragment, null, {
      includedRanges: ranges(fragment, ["TO", "DO"]),
    });
    assert.equal(fragments.rootNode.descendantsOfType("todo").length, 0);
  });

  test("batches uppercase non-markers with bounded parser work", (t) => {
    const parser = parserFor(t, create);
    for (const pattern of [
      "ABCD ",
      "FoTODO ",
      "TODO1TODO ",
      "TODO_TODO ",
      "FIXME2BUG ",
    ]) {
      const text = pattern.repeat(8192);
      const counts = logCounts(parser, "_other_text");
      const tree = parse(t, parser, `${text}TODO end`);
      parser.setLogger(null);
      assert.deepEqual(
        tree.rootNode.descendantsOfType("todo").map((node) => node.text),
        ["TODO end"],
      );
      assert.ok(
        counts.text > 0 && counts.text < text.length / 1024 + 8,
        JSON.stringify(counts),
      );
      assert.ok(counts.steps < text.length / 256 + 64, JSON.stringify(counts));
    }
  });

  test("keeps word boundaries around text chunk boundaries", (t) => {
    const parser = parserFor(t, create);
    for (let length = 4088; length <= 4104; length++) {
      for (const character of ["A", "a"]) {
        const tree = parse(
          t,
          parser,
          `${character.repeat(length)}TODO invalid\nTODO valid`,
        );
        assert.deepEqual(
          tree.rootNode.descendantsOfType("todo").map((node) => node.text),
          ["TODO valid"],
        );
      }
    }
  });

  test("reuses text chunks after an edit in a long paragraph", (t) => {
    const parser = parserFor(t, create);
    let source = `${"ordinary words ".repeat(5000)} TODO end`;
    let tree = parse(t, parser, source);
    source = edit(tree, source, 30000, 1, "O");
    const counts = logCounts(parser, "_other_text");
    tree = parse(t, parser, source, tree);
    parser.setLogger(null);
    assert.ok(counts.consumed < 16384, JSON.stringify(counts));
    assert.ok(counts.steps < 128, JSON.stringify(counts));
    assert.deepEqual(
      snapshot(tree, ["todo", "todo_token", "todo_body"]),
      snapshot(parse(t, parser, source), ["todo", "todo_token", "todo_body"]),
    );
  });

  test("matches fresh parsing after edits to word boundaries, NUL and Unicode", (t) => {
    const parser = parserFor(t, create);
    let seed = 3119;
    const random = (n) => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed % n;
    };
    const pieces = [
      "TODO",
      "FIXME",
      "NOTE",
      "FoTODO",
      "TODO1TODO",
      "TODO_TODO",
      " ordinary ",
      "\n",
      "\r\n",
      "\0",
      "ą",
      "🐱",
    ];
    let source = pieces.join(" ");
    let tree = parse(t, parser, source);
    for (let index = 0; index < 400; index++) {
      const offset = random(source.length + 1);
      const deleted = Math.min(random(8), source.length - offset);
      source = edit(
        tree,
        source,
        offset,
        deleted,
        pieces[random(pieces.length)],
      );
      tree = parse(t, parser, source, tree);
      assert.deepEqual(
        snapshot(tree, ["todo", "todo_token", "todo_body"]),
        snapshot(parse(t, parser, source), ["todo", "todo_token", "todo_body"]),
      );
    }
  });
};
