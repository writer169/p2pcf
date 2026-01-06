# Настройка Cloudflare TURN

## Шаг 1: Создание TURN Application в Cloudflare Dashboard

1. Войдите в [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Перейдите в раздел **Calls** (или **Realtime**)
3. Создайте новое TURN Application
4. Сохраните **Account ID** (он будет виден в URL или в настройках)

## Шаг 2: Создание TURN Key

1. В разделе TURN Application нажмите **Create TURN Key**
2. Сохраните **TURN Key ID** (uid)

> ℹ️ **Примечание**: TURN Key Secret не требуется для генерации credentials через API. Используется только Key ID + API Token.

## Шаг 3: Создание API Token

1. Перейдите в **My Profile** → **API Tokens**
2. Нажмите **Create Token**
3. Выберите **Custom token**
4. Настройте права:
   - **Account** → ваш аккаунт
   - **Permissions**: Calls → Edit (или Read/Write)
5. Нажмите **Continue to summary** → **Create Token**
6. Сохраните **API Token** (будет показан только один раз!)

## Шаг 4: Настройка локальной разработки

Создайте файл `.dev.vars` в корне проекта (скопируйте из `.dev.vars.example`):

```bash
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_TURN_KEY_ID=your_turn_key_id_here
```

> ⚠️ **ВАЖНО**: Файл `.dev.vars` не должен попадать в Git! Убедитесь, что он в `.gitignore`

## Шаг 5: Настройка Production

Для production используйте Wrangler secrets:

```bash
cd c:\Users\user\Desktop\Antigravity\Videosviaz

# Установите каждый секрет
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put CLOUDFLARE_TURN_KEY_ID
```

При каждой команде вам будет предложено ввести значение.

## Шаг 6: Локальное тестирование

```bash
# Запуск локального Worker
npx wrangler dev

# В браузере откройте http://localhost:8787
# Проверьте консоль на наличие сообщения:
# "✓ Loaded Cloudflare TURN servers: N"
```

## Шаг 7: Deploy в Production

```bash
npx wrangler deploy
```

## Проверка работы

После deploy откройте приложение в браузере и:

1. Откройте **DevTools** → **Console**
2. Присоединитесь к комнате
3. Проверьте наличие сообщения: `✓ Loaded Cloudflare TURN servers: N`
4. Если видите `⚠ Cloudflare TURN not available, using fallback TURN servers` — проверьте credentials

## Troubleshooting

### Не загружаются Cloudflare TURN серверы

1. Проверьте консоль браузера на ошибки
2. Откройте в браузере: `https://your-worker.workers.dev/api/turn/credentials`
3. Должен вернуться JSON: `{"iceServers": [...]}`
4. Если `{"iceServers": []}` — проверьте credentials в Worker

### API Token ошибки

- Убедитесь, что API Token имеет права на Calls API
- Проверьте, что Account ID правильный
- Токен не истек

### TURN Key ошибки

- Проверьте правильность TURN_KEY_ID и TURN_KEY_SECRET
- Убедитесь, что ключ не удален в Dashboard
