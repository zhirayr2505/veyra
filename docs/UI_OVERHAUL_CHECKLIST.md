# VEYRA — UI OVERHAUL CHECKLIST

Дата: 2026-10-14. Ветка: `feat/ui-overhaul-2026-10-14`.

**Защищено:** фазность, скорость, кадры и композиционный ScrollTimeline сворачивания шапки профиля. Изменения треков допускаются только для декоративных слоёв без изменения `hero/panel/identity/actions`.

Обозначения: `[ ]` не начато; `[~]` в работе; `[x]` завершено и проверено; `[!]` заблокировано (указать причину). После каждого пункта — запуск `npm run lint` и `npm test`, результат отражается здесь. Нельзя отмечать `[x]` без доказательства проверки.

| Статус | № | Задача | Изменённые файлы | Как проверено / блокировка |
|---|---|---|---|---|
| [x] | 1.1 | Убрать серую размытую полосу под вкладками | `MemberReferencePolish.css`, `MemberFinish.css`, `MemberMotion5.css`, `profileScrollTimeline.js`, `useVeyraProfileMotion.js`, `tests/profile-scrolltimeline.test.js` | GitHub Actions #38540092434: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓, `secrets:check` ✓; Android — требуется |
| [x] | 1.2 | Исключить квадратную рамку при морфинге | `profileScrollTimeline.js`, `useVeyraProfileMotion.js`, `tests/profile-scrolltimeline.test.js` | CI #38540582183: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; устройство — требуется |
| [x] | 1.3 | Перенести индикатор фото вниз обложки | `PhotoSegments.jsx`, `PhotoSegments.css`, `Member.jsx`, `ProfilePreview.jsx`, `MemberMotionV2.css`, `MemberTelegramProfile.css`, `ProfilePreview.css` | CI #38541511154: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; Telegram Android — требуется |
| [x] | 1.4 | Улучшить контраст логотипа и scrim | `MemberMotionV2.css` | CI #38541967543: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; реальные фото Android — требуется |
| [x] | 5.1 | Мгновенный каркас профиля из данных карточки | `profileSeed.js`, `tests/profile-seed.test.js`, `Member.jsx`, `MemberMotion5.css`, `App.jsx`, `Discover.jsx`, `Likes.jsx`, `Chats.jsx`, `DiscoveryHub.jsx` | CI #38542826974: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; физический Android — требуется |
| [x] | 5.2 | Кэш фото, LQIP и доминантный цвет | `api.js`, `server/photo-placeholder.js`, `server/app.js`, `server/registration.js`, `server/domain.js`, `Member.jsx`, `migrations/023_photo_lqip.sql`, `scripts/backfill-photo-placeholders.js`, `tests/photo-placeholder.test.js` | CI #38543625688: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; заполнение старых фото требует запуска скрипта после деплоя |
| [x] | 5.3 | Плавный переход blur → sharp после decode | `UI.jsx`, `PhotoReveal.css`, `Member.jsx` | CI #38544310002: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; Android визуально проверить |
| [x] | 5.4 | Приоритетная предзагрузка 960/640 | `Discover.jsx`, `DiscoveryHub.jsx` | CI #38544872878: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; скорость сети на Android — требуется |
| [x] | 5.5 | Единый Photo для всех экранов | `Discover.jsx`, `Discover.css`, `Member.jsx`, `Likes.jsx`, `Chats.jsx`, `PersonQuickPreview.jsx`, `ProfilePreview.jsx`, `Registration.jsx` | CI #38545507007: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; ручная UX-проверка ещё требуется |
| [x] | 5.6 | Красивое состояние ошибки с повтором | `UI.jsx`, `PhotoReveal.css` | CI #38545898706: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; ошибка на Android — требуется |
| [x] | 3 | Горизонтальный свайп фото за пальцем | `HeroPhotoTrack.jsx`, `HeroPhotoTrack.css`, `photoSwipeMath.js`, `tests/photo-swipe.test.js`, `Member.jsx`, `useVeyraProfileMotion.js`, `MemberMotionV2.css`, `MemberReferencePolish.css`, `MemberTelegramProfile.css`, `PhotoSegments.css` | CI #38547027018: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; Playwright и физическое устройство — ещё проверить |
| [x] | 2 | Общий LiquidLogo и плавная смена тона | `LiquidLogo.jsx`, `LiquidLogo.css`, `UI.jsx`, `Member.jsx`, `MemberMotion5.css`, `MemberMotion6.css`, `MemberFinish.css`, `MemberReferencePolish.css`, `MemberStickyPortal.css`, `Registration2026.css`, `Discover.jsx`, `DiscoveryHub.jsx`, `FeedPremium2026.css`, `useVeyraProfileMotion.js`, `tests/approved-work-assets.test.js`, `tests/veyra-brand-consistency.test.js` | CI #38548199719: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; реальный Telegram Android и контрастные фото ещё проверить |
| [x] | 4.1 | Единые дизайн-токены | `tokens.css`, `App.jsx`, `V2.css`, `Registration2026.css`, `ProfilePreview.css`, `MemberPolish7.css`, `BrandConsistency.css`, `tests/ui-tokens.test.js`, `tests/telegram-swipe-profile-polish.test.js`, `tests/veyra-brand-consistency.test.js` | CI #38549891572: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; перенос оставшихся локальных цветов в общие компоненты (4.2–6.1), Android QA |
| [x] | 4.2 | Button / Choice / InterestChip | `UI.jsx`, `UiPrimitives.css`, `Registration.jsx`, `OnboardingOptions.jsx`, `Member.jsx`, `ProfilePreview.jsx`, `Discover.jsx`, `tests/ui-components.test.js` | CI #38550831532: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; Android visual + touch QA still needed |
| [x] | 4.3 | Цветные интересы в регистрации | `OnboardingOptions.jsx`, `OnboardingV9.css`, `tests/interest-picker-ui.test.js` | CI #38551424163: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; визуально и haptic Telegram Android — требуется |
| [x] | 4.4 | Превью через настоящий Member | `Member.jsx`, `ProfilePreview.jsx`, `ProfilePreview.css`, `FeedCardVisual.jsx`, `Discover.jsx`, `tests/member-readonly-preview.test.js`, `tests/ui-components.test.js` | CI #38553212186: `npm run check` (`npm test` + build) ✓, `npm run lint` ✓; Telegram device visual/scroll QA required |
| [x] | 4.5 | Единая система иконок | `Registration.jsx`, `Registration2026.css`, `tests/approved-work-assets.test.js`, `tests/registration-icons.test.js` | CI #38553931608: npm test/build ✓, npm run lint ✓; icon appearance in Telegram Android needs visual check |
| [x] | 4.6 | Клавиатура, локальные ошибки, цели | `Registration.jsx`, `Registration2026.css`, `OnboardingOptions.jsx`, `tests/registration-keyboard-validation.test.js` | CI #38554400354: npm run check (test/build) ✓, npm run lint ✓; Telegram keyboard animation/device QA pending |
| [x] | 4.7 | Имена с дефисом и апострофом | `Registration.jsx`, `server/validation.js`, `server/registration.js`, `tests/international-names.test.js` | CI #38554728663: npm run check (test/build) ✓, npm run lint ✓; backend accepts hyphen and both apostrophes |
| [x] | 4.8 | Сжатие и загрузка фотографий | `compressPortrait.js`, `Registration.jsx`, `Registration2026.css`, `tests/photo-compression-client.test.js` | CI #38555242098: npm run check (test/build) ✓, npm run lint ✓; real Android camera files and memory testing pending |
| [x] | 4.9 | Хаптика и доступность | `haptics.js`, `UI.jsx`, `Registration.jsx`, `OnboardingOptions.jsx`, `UiPrimitives.css`, `Registration2026.css`, `tests/veyra-haptics-a11y.test.js`, `tests/interest-picker-ui.test.js`, `tests/registration-keyboard-validation.test.js` | CI #38556038178: npm run check ✓, npm run lint ✓; manual contrast audit, Telegram haptic and 44px touch-area inspection still required |
| [x] | 6.1 | Обновить регистрацию и связанные экраны | `ProfileEditor.jsx`, `Legal.jsx`, `CompletionScene.jsx`, `CompletionScene.css`, `OnboardingUnified.css`, `tests/onboarding-unified.test.js` | CI #38556746618: npm run check (test/build) ✓, npm run lint ✓; screenshots and all 8 stages on Telegram Android require device review |
| [x] | 6.2 | Плавные переходы шагов | `Registration.jsx`, `RegistrationTransitions.css`, `OnboardingHeader.jsx`, `tests/registration-step-transition.test.js` | CI #38557574487: npm run check (test/build) ✓, npm run lint ✓; Chrome Telegram Android visual/easing/focus verification pending |
| [~] | 6.3 | Микроанимации вариантов и успеха | — | Choice selection response, photo reveal/progress, one-shot completion confetti |
| [ ] | 6.4 | Финальная приёмка и 60 fps | — | Не начато |

## Ручная приёмка на реальном Android/Telegram

- [ ] Нет серой полосы в expanded / morph / compact; контент свободно скроллится.
- [ ] Rim появляется только после образования круга.
- [ ] Индикатор не мешает логотипу или штатным кнопкам Telegram.
- [ ] Лого читается на светлом и тёмном фото; смена тона без вспышки.
- [ ] Горизонтальный свайп следует за пальцем; вертикальный скролл независим.
- [ ] LQIP является той же фотографией, что и оригинал; fade <= 280 ms.
- [ ] Никаких белых экранов во время открытия чужой анкеты.
- [ ] Имя с дефисом и апострофом сохраняется на сервере.
- [ ] Все 8 шагов регистрации, превью, Legal, Completion и редактор в едином стиле.
- [ ] Переходы, аппаратная клавиатура, reduced-motion, экранные читалки.
- [ ] Плавность 60 fps на физическом Android (не подтверждается юнит-тестами).

## Ход проверок

Ожидаются покомпонентные отчёты. CI GitHub Actions настроен на pull_request; это не заменяет проверку на устройстве.

- **1.1:** CI https://github.com/zhirayr2505/veyra/actions/runs/38540092434 — тесты/сборка и ESLint прошли; проверка реального Telegram Android ещё нужна.

- **1.2:** CI https://github.com/zhirayr2505/veyra/actions/runs/38540582183 — npm test, build и ESLint прошли.

- **1.3:** CI https://github.com/zhirayr2505/veyra/actions/runs/38541511154 — npm test, build и ESLint прошли; индикатор требует устройства для оценки в динамике.

- **1.4:** CI https://github.com/zhirayr2505/veyra/actions/runs/38541967543 — npm test/build/ESLint прошли; верхний градиент проверять на светлом и тёмном фото.

- **5.1:** CI https://github.com/zhirayr2505/veyra/actions/runs/38542826974 — npm test/build/ESLint прошли; показываются seed-данные до ответа сервера.

- **5.2:** CI https://github.com/zhirayr2505/veyra/actions/runs/38543625688 — тесты/сборка/ESLint прошли. Миграция автоматическая при запуске сервера; старые фото обрабатывает отдельный ограниченный batch-скрипт `node --env-file-if-exists=.env scripts/backfill-photo-placeholders.js`, запуск после деплоя нужен отдельно.
