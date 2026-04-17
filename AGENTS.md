# Agent Guidelines

## Do

- Keep each function focused on a single responsibility. For example, a function that converts a string to a number should not also handle whether the input is `undefined`.
- Prefer a functional style when it makes the code clearer. Ideally, a function should either return a value or cause side effects, but not both.
- If you need a simple status result, returning a boolean is acceptable, but a cleaner alternative is usually better.
- Pass data and dependencies as arguments instead of reading them from global state whenever possible.
- Add brief descriptions for functions, classes, or logic that may be hard to understand.
- Keep control flow simple. Avoid deeply nested functions or `if` statements when a flatter structure will do.

## Don't

- Follow these guidelines dogmatically. Use judgment.
- Use single-letter variable or parameter names unless the scope is very small and the meaning is obvious.
- Use overly verbose descriptions or function names.

