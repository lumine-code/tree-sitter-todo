module.exports = grammar({
  name: "TODO",

  externals: ($) => [$.todo_token, $.todo_body, $._other_text],

  rules: {
    program: ($) => repeat(choice($.todo, $._text)),

    todo: ($) => prec(1, seq($.todo_token, optional($.todo_body))),

    _text: ($) => choice(/[^A-Z]+/, $._other_text),
  },
});
