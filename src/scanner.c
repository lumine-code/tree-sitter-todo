#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>

enum TokenType {
  TODO_TOKEN,
  TODO_BODY,
  TEXT,
};

static const char *TODO_NAMES[] = {
  "TODO",     "FIXME", "CHANGED",  "XXX",      "IDEA",  "HACK",
  "NOTE",     "REVIEW", "NB",      "BUG",      "QUESTION",
  "COMBAK",   "TEMP",  "DEBUG",    "OPTIMIZE", "WARNING",
};

static bool is_ascii_upper(int32_t character) {
  return character >= 'A' && character <= 'Z';
}

static bool is_ascii_lower(int32_t character) {
  return character >= 'a' && character <= 'z';
}

static bool is_ascii_digit(int32_t character) {
  return character >= '0' && character <= '9';
}

static bool is_ascii_alphanumeric(int32_t character) {
  return is_ascii_upper(character) || is_ascii_lower(character) ||
         is_ascii_digit(character);
}

static bool strings_equal(const char *left, const char *right) {
  while (*left && *right && *left == *right) {
    left++;
    right++;
  }
  return *left == *right;
}

static bool is_todo_name(const char *name) {
  size_t count = sizeof(TODO_NAMES) / sizeof(TODO_NAMES[0]);
  for (size_t index = 0; index < count; index++) {
    if (strings_equal(name, TODO_NAMES[index])) {
      return true;
    }
  }
  return false;
}

static bool return_as_text(TSLexer *lexer) {
  lexer->advance(lexer, true);
  lexer->mark_end(lexer);
  lexer->result_symbol = TEXT;
  return true;
}

static bool scan_todo(TSLexer *lexer) {
  char name[16] = {0};
  size_t length = 0;

  while (lexer->lookahead) {
    if (is_ascii_upper(lexer->lookahead)) {
      if (length + 1 < sizeof(name)) {
        name[length++] = (char)lexer->lookahead;
      }
      lexer->advance(lexer, false);
    } else if (is_ascii_lower(lexer->lookahead)) {
      return return_as_text(lexer);
    } else if (is_ascii_digit(lexer->lookahead) || lexer->lookahead == '_') {
      return return_as_text(lexer);
    } else {
      break;
    }
  }

  lexer->mark_end(lexer);
  lexer->result_symbol = is_todo_name(name) ? TODO_TOKEN : TEXT;
  return true;
}

static bool scan_todo_body(TSLexer *lexer) {
  if (lexer->lookahead == '\n') {
    return return_as_text(lexer);
  }

  while (lexer->lookahead && lexer->lookahead != '\n') {
    lexer->advance(lexer, false);
  }

  lexer->mark_end(lexer);
  lexer->result_symbol = TODO_BODY;
  return true;
}

static bool scan_text(TSLexer *lexer) {
  bool next_can_be_todo = true;

  while (lexer->lookahead) {
    if (next_can_be_todo && is_ascii_upper(lexer->lookahead)) {
      break;
    }

    next_can_be_todo =
      !(is_ascii_alphanumeric(lexer->lookahead) || lexer->lookahead == '_');
    lexer->advance(lexer, true);
  }

  lexer->mark_end(lexer);
  lexer->result_symbol = TEXT;
  return true;
}

void *tree_sitter_TODO_external_scanner_create(void) {
  return NULL;
}

bool tree_sitter_TODO_external_scanner_scan(
  void *payload,
  TSLexer *lexer,
  const bool *valid_symbols
) {
  (void)payload;

  if (!lexer->lookahead) {
    return false;
  }

  if (valid_symbols[TODO_BODY]) {
    return scan_todo_body(lexer);
  }

  if (is_ascii_upper(lexer->lookahead)) {
    return scan_todo(lexer);
  }

  return scan_text(lexer);
}

unsigned tree_sitter_TODO_external_scanner_serialize(
  void *payload,
  char *buffer
) {
  (void)payload;
  (void)buffer;
  return 0;
}

void tree_sitter_TODO_external_scanner_deserialize(
  void *payload,
  const char *buffer,
  unsigned length
) {
  (void)payload;
  (void)buffer;
  (void)length;
}

void tree_sitter_TODO_external_scanner_destroy(void *payload) {
  (void)payload;
}
