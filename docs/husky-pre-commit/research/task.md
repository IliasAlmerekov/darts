# Task: husky-pre-commit

## Slug

- `husky-pre-commit`

## Ticket

### 4.1 Create `.husky/pre-commit`

Problem: `lint-staged` is configured in `package.json`, but `.husky/pre-commit` is missing, so `lint-staged` does not run automatically.

Task:

```sh
#!/usr/bin/env sh

. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

```sh
chmod +x .husky/pre-commit
```

Also remove the `"husky": "npm run stylelint && npm run eslint"` script from `package.json`, because it runs full-project linting instead of checking only staged files.
