#include "tree_sitter/parser.h"

#include <stddef.h>
#include <string.h>

enum TokenType { TODO_TOKEN, TODO_BODY, TEXT };
enum { TEXT_CHUNK_SIZE = 4096, MAX_NAME_SIZE = 8 };

static const char *const TODO_NAMES[] = {
  "TODO", "FIXME", "CHANGED", "XXX", "IDEA", "HACK", "NOTE", "REVIEW",
  "NB", "BUG", "QUESTION", "COMBAK", "TEMP", "DEBUG", "OPTIMIZE", "WARNING",
};

static bool is_upper(int32_t character) {
  return character >= 'A' && character <= 'Z';
}

static bool is_identifier_character(int32_t character) {
  return is_upper(character) || (character >= 'a' && character <= 'z') ||
         (character >= '0' && character <= '9') || character == '_';
}

// Consume the entire identifier even after it ceases to be a possible marker.
// Otherwise a suffix such as the TODO in FoTODO would get a new left boundary.
static bool scan_name(TSLexer *lexer, uint32_t *text_size) {
  char name[MAX_NAME_SIZE + 1] = {0};
  size_t length = 0;
  bool possible = true;
  do {
    int32_t character = lexer->lookahead;
    if (!is_upper(character) || length == MAX_NAME_SIZE) {
      possible = false;
    } else {
      name[length++] = (char)character;
    }
    lexer->advance(lexer, false);
    (*text_size)++;
    if (lexer->is_at_included_range_start(lexer)) break;
  } while (!lexer->eof(lexer) && is_identifier_character(lexer->lookahead));

  if (!possible) return false;
  for (size_t index = 0; index < sizeof(TODO_NAMES) / sizeof(TODO_NAMES[0]); index++) {
    if (strcmp(name, TODO_NAMES[index]) == 0) return true;
  }
  return false;
}

static bool scan_body(TSLexer *lexer) {
  if (lexer->is_at_included_range_start(lexer) ||
      lexer->lookahead == '\r' || lexer->lookahead == '\n') return false;
  do {
    lexer->advance(lexer, false);
    if (lexer->is_at_included_range_start(lexer)) break;
  } while (!lexer->eof(lexer) && lexer->lookahead != '\r' &&
           lexer->lookahead != '\n');
  lexer->mark_end(lexer);
  lexer->result_symbol = TODO_BODY;
  return true;
}

void *tree_sitter_TODO_external_scanner_create(void) { return NULL; }

bool tree_sitter_TODO_external_scanner_scan(
  void *payload, TSLexer *lexer, const bool *valid_symbols
) {
  (void)payload;
  if (lexer->eof(lexer)) return false;
  if (valid_symbols[TODO_BODY] && scan_body(lexer)) return true;
  if (!valid_symbols[TEXT] && !valid_symbols[TODO_TOKEN]) return false;

  bool has_text = false;
  bool boundary = true;
  uint32_t text_size = 0;
  while (!lexer->eof(lexer)) {
    if (has_text && (lexer->is_at_included_range_start(lexer) ||
        (text_size >= TEXT_CHUNK_SIZE &&
         !is_identifier_character(lexer->lookahead)))) break;
    if (boundary && is_upper(lexer->lookahead)) {
      if (has_text) lexer->mark_end(lexer);
      if (scan_name(lexer, &text_size) && valid_symbols[TODO_TOKEN]) {
        if (has_text) {
          if (!valid_symbols[TEXT]) return false;
          lexer->result_symbol = TEXT;
        } else {
          lexer->mark_end(lexer);
          lexer->result_symbol = TODO_TOKEN;
        }
        return true;
      }
      has_text = true;
      boundary = false;
      if (lexer->is_at_included_range_start(lexer)) break;
      continue;
    }
    int32_t character = lexer->lookahead;
    boundary = !is_identifier_character(character);
    lexer->advance(lexer, false);
    has_text = true;
    text_size++;
    if (character == '\n' || character == '\r') break;
  }
  if (!has_text || !valid_symbols[TEXT]) return false;
  lexer->mark_end(lexer);
  lexer->result_symbol = TEXT;
  return true;
}

unsigned tree_sitter_TODO_external_scanner_serialize(void *payload, char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}

void tree_sitter_TODO_external_scanner_deserialize(
  void *payload, const char *buffer, unsigned length
) {
  (void)payload;
  (void)buffer;
  (void)length;
}

void tree_sitter_TODO_external_scanner_destroy(void *payload) { (void)payload; }
