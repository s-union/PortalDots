# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->

- 2026-03-16: 移行棚卸しの結果、主要 CRUD は frontend/backend へかなり移行済みだが、auth 周辺の onboarding/recovery、参加登録フロー互換、staff tags/places export などに legacy 依存や齟齬が残る。
- 2026-03-16: すぐ着手しやすい高優先度候補は、`frontend/src/pages/login.vue` の legacy 直リンク解消、`workspace/forms` タブの実装、`staff/tags` と `staff/places` の CSV export 接続、`staff/circles/[circleId].vue` と Go API の participation type 可否整合。
