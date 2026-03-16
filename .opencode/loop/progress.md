# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->

- 2026-03-15: `frontend/src/pages/workspace/settings.vue` は表示名とパスワードのみ移植済みで、legacy の `resources/views/users/appearance.blade.php` と `resources/views/users/delete.blade.php` 相当が未着手。
- 2026-03-15: 外観設定は Laravel の `UIThemeService` が `ui_theme` cookie を `light|dark|system` で保持している。frontend 側は `prefers-color-scheme` のみで cookie 読み書きが未実装。
- 2026-03-15: backend の `useradmin.User` と session bootstrap は `displayName` しか返せないため、一般設定 full 移植より先に着手しやすいのは外観設定とアカウント削除。
- 2026-03-15: legacy のアカウント削除制約は「admin/staff は削除不可」「企画所属中は削除不可」。Go 側でも circle 所属情報は `useradmin.User.CircleIDs` で判定できる。
- 2026-03-15: 外観設定は API 不要で先に frontend だけ移植できる。`frontend/index.html` で初期クラスを先に付けないと hydration 前にライト/ダークが一瞬ずれる。
- 2026-03-15: `frontend/src/styles/app.css` は `:root` ベースだったため、legacy 同様の `theme-light|theme-dark|theme-system` クラス分岐へ寄せると cookie 保存テーマを再現しやすい。
- 2026-03-16: アカウント削除の可否は frontend の推測ではなく `session/bootstrap` の `user.canDeleteAccount` を唯一の真実として扱うと、`currentCircle` と `CircleIDs` のズレを UI に持ち込まずに済む。
- 2026-03-16: `session/bootstrap` の `canDeleteAccount` は OpenAPI 上は必須だが、既存テスト fixture には未指定が残るため、store と zod schema では `false` fallback を入れつつ API 契約自体は必須のまま保つと移行中でも安全。
- 2026-03-16: `openapi-typescript` の generated schema で path parameter が欠けるときは、generated 側ではなく `backend/api/openapi.yaml` の endpoint 定義を見直す。今回は circle 系 endpoint 定義を揃えることで `/circles/current/members/{userID}` と `/circles/join/{token}` の path 型崩れを解消できた。
- 2026-03-16: `frontend ci:check` は task 3 完了時点でも `frontend/src/features/circles/api.ts` の既存 `no-floating-promises` warnings を出すが、error ではなく今回変更起因でもない。
- 2026-03-16: task 4 では backend 側に「staff は削除不可」の API test を追加し、frontend 側に「DELETE 422 の validation message をそのまま表示する」テストを追加した。削除失敗時は session を維持したまま同一画面に留まることも合わせて確認できる。

- 2026-03-16: ループ再調査の結果、最優先は `frontend/src/pages/circles/new.vue` の staff API 依存を外すこと。現状は一般利用者導線なのに `/staff/participation-types` を叩いており、非 staff では migrated UI から企画作成が成立しない。
- 2026-03-16: 一般ユーザー向け参加種別一覧は `GET /v1/participation-types` として追加し、legacy の `ParticipationType::open()->public()` に合わせて `form.IsPublic && form.IsOpen` のものだけ返す。response shape は staff 用 mapping を共通化して流用できた。
- 2026-03-16: `frontend/src/pages/circles/new.vue` は `frontend/src/features/participation-types/api.ts` の public query に差し替えた。staff 用 feature は管理画面でも使うので別 feature のまま残し、一般利用者導線だけ endpoint を分離するのが安全。
