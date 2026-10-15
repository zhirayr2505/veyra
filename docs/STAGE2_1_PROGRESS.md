# VEYRA — ЭТАП 2.1 / PROFILE FIXES

## Исходное состояние и безопасный откат
- Исходный `main` (15.10.2026): `d2a8d6d4a7e798163626a27e59f0f8a29ca8f1dd` — merge PR #80, ЭТАП 2.
- Первая родительская ревизия PR #80: `8a87fbbc1b72cc6bb572c0da114ad429a8283456`.
- Ветка ЭТАПА 2.1: `stage2-1/profile-fixes-20261015`.
- Если опубликованный ЭТАП 2.1 сломает production после merge, команда отката **его** merge-коммита: `git checkout main && git pull --ff-only && git revert -m 1 <STAGE2_1_MERGE_SHA> && git push origin main` — только после проверки SHA и логов. Для отката исходного PR #80: `git revert -m 1 d2a8d6d4a7e798163626a27e59f0f8a29ca8f1dd` (не запускать без отдельного подтверждённого основания).
- Не трогать production-данные, платежи, Premium, VEYS, Stage 0 snapshot; не менять Stage 1; Stage 3 запрещён.
- Не добавлять CSS override-файлы или `!important`; единственный движок профиля ScrollTimeline с JS fallback в `useVeyraProfileMotion.js`.

## План и честность проверки
- Исходные показатели p50/p95, long tasks >50мс, >8.3/16.7мс, Member render, layout shifts: **не измерены до правок**, ожидают доступной mobile-лаборатории. Не выдумывать числа.
- Шаги: 1 размытие; 2 morph 180ms; 3 settle/overscroll/calibration; 4 высоты; 5 preview actions; 6 нижний отступ; 7 seam; 8 чипы/goal; 9 feed overlay; 10 имя; 11 тесты/снимки/метрики; 12 CI, один PR, merge, один Render deploy, health, ручная приёмка Galaxy A55.
- Реальные FPS/120 Гц, нижняя резинка WebView и смартфонные жесты: проверяются владельцем вручную.
- Запись дефектов, фактических изменений, CI и деплоя обновлять по мере подтверждения. Не считать задачи выполненными до результатов.
