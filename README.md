# tree-sitter-todo

A Tree-sitter grammar for TODO-style annotations in text.

## Features

- **Grammars**: provides Tree-sitter grammars.
- **TODO markers**: recognizes common annotations including `TODO`, `FIXME`, `NOTE`, `BUG`, and `WARNING`.
- **Word boundaries**: distinguishes standalone annotations from markers embedded within identifiers.
- **Portable scanner**: supports native and WebAssembly builds through a C external scanner.

## Installation

```sh
npm install tree-sitter @lumine-code/tree-sitter-todo
```

## Usage

```js
const Parser = require("tree-sitter");
const TODO = require("@lumine-code/tree-sitter-todo");

const parser = new Parser();
parser.setLanguage(TODO);
const tree = parser.parse("TODO: document this");
```

## Building

```sh
npm install
npm test
npm run build:wasm
```

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
