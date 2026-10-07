module.exports = grammar({
  name: "TODO",

  extras: () => [],

  externals: ($) => [$.todo_token, $.todo_body, $._other_text],

  rules: {
    program: ($) => repeat(choice($.todo, $._other_text)),

    todo: ($) => seq($.todo_token, optional($.todo_body)),
  },
});
