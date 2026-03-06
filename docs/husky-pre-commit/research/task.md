# Task: husky-pre-commit

## Slug

- `husky-pre-commit`

## Ticket

### 4.1 Создать `.husky/pre-commit`

Проблема: `lint-staged` настроен в `package.json`, но `.husky/pre-commit` отсутствует, поэтому `lint-staged` не запускается автоматически.

Задача:

```sh
#!/usr/bin/env sh

. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

```sh
chmod +x .husky/pre-commit
```

Также удалить из `package.json` скрипт `"husky": "npm run stylelint && npm run eslint"`, потому что он запускает полный линтинг проекта вместо проверки только staged-файлов.
