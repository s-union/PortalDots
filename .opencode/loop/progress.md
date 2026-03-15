# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->

- 2026-03-15: `frontend/src/pages/workspace/settings.vue` は表示名とパスワードのみ移植済みで、legacy の `resources/views/users/appearance.blade.php` と `resources/views/users/delete.blade.php` 相当が未着手。
- 2026-03-15: 外観設定は Laravel の `UIThemeService` が `ui_theme` cookie を `light|dark|system` で保持している。frontend 側は `prefers-color-scheme` のみで cookie 読み書きが未実装。
- 2026-03-15: backend の `useradmin.User` と session bootstrap は `displayName` しか返せないため、一般設定 full 移植より先に着手しやすいのは外観設定とアカウント削除。
- 2026-03-15: legacy のアカウント削除制約は「admin/staff は削除不可」「企画所属中は削除不可」。Go 側でも circle 所属情報は `useradmin.User.CircleIDs` で判定できる。
