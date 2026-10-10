# VEYRA 2.0 — правила использования ассетов

## Статус
Готовая самостоятельная библиотека для **следующей пересборки интерфейса**. Этот коммит намеренно **не переключает** текущий production на новую тему.

## Установка
Из корня репозитория запустите:

```bash
node veyra-assets/tools/verify.mjs
node veyra-assets/tools/sync-public.mjs
```

После копирования браузерные пути будут вида:
- `/veyra-v2/brand/veyra-wordmark-purple.svg`
- `/veyra-v2/icons/outline/heart.svg`
- `/veyra-v2/icons/active/heart.svg`
- `/veyra-v2/interests/music.svg`
- `/veyra-v2/illustrations/no-chats.svg`

CSS-слои:
```js
import '../../veyra-assets/tokens/tokens.css';
import '../../veyra-assets/styles/components.css';
import '../../veyra-assets/styles/motion.css';
```
Путь импорта определяется расположением нового фронтенд-модуля. Оба файла изолированы под классом `.veyra-v2`, токены используют имена с префиксом `--v2-`.

## Архитектурные принципы
1. Нижняя навигация: **Поиск · Знакомства · Симпатии · Чаты · Профиль**.
2. Поиск: сетка людей и фильтры. Знакомства: одна карточка за раз.
3. Симпатии: новые лайки, взаимные симпатии, приватность. Чаты: реальные переписки.
4. Telegram initData и серверная авторизация остаются источником истины, как и Supabase, модерация, платежи и настоящие фотографии.
5. Логотип VEYRA оригинальный и не копирует знак Badoo.
6. Не демонстрировать выдуманные профили как реальные; в production пустые состояния использовать согласно API.
7. `photo-card` не подставляет изображения других людей автоматически: только реальные фото из профиля.

## Маппинг будущего интерфейса
| Экран | Иконка | Illustration |
|---|---|---|
| Знакомства | `icons/*/encounters.svg` | `no-profiles.svg` |
| Поиск | `icons/*/search.svg` | `no-search.svg` |
| Симпатии | `icons/*/heart.svg` | `no-likes.svg` или `no-matches.svg` |
| Чаты | `icons/*/chat.svg` | `no-chats.svg` |
| Профиль | `icons/*/user.svg` | `no-photos.svg` |
| Верификация | `icons/*/verified.svg` | `moderation.svg` |
| Подарки | `icons/*/gift.svg` | `no-gifts.svg` |

## Как не получить старый визуал
- Не смешивать `05_premium_icons`, глянцевые WebP и новый V2 pack.
- При активации нового V2 фронтенда подключать ассеты из одного каталога `/veyra-v2/`.
- Не менять рабочие данные или backend при замене только дизайна.
- Прогонять `npm run check`, `npx playwright test --project=v5` и проверять реальные mobile-скриншоты.
