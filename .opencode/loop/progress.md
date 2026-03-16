# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->

- 2026-03-16: 移行棚卸しの結果、主要 CRUD は frontend/backend へかなり移行済みだが、auth 周辺の onboarding/recovery、参加登録フロー互換、staff tags/places export などに legacy 依存や齟齬が残る。
- 2026-03-16: すぐ着手しやすい高優先度候補は、`frontend/src/pages/login.vue` の legacy 直リンク解消、`workspace/forms` タブの実装、`staff/tags` と `staff/places` の CSV export 接続、`staff/circles/[circleId].vue` と Go API の participation type 可否整合。
- 2026-03-16: `frontend/src/pages/workspace/forms/index.vue` のタブは `?status=open|closed|all` を唯一の状態源にすると、legacy の 3 タブ導線を 1 API のまま再現できる。`open` は query 省略を既定にすると URL も短く保てる。
- 2026-03-16: `workspace/forms` の回帰テストでは open/closed/all それぞれで見えるフォーム名と router query を一緒に検証すると、見た目だけのタブへ戻る退行を防ぎやすい。
