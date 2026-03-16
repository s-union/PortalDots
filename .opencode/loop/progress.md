# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->

- 2026-03-16: 移行棚卸しの結果、主要 CRUD は frontend/backend へかなり移行済みだが、auth 周辺の onboarding/recovery、参加登録フロー互換、staff tags/places export などに legacy 依存や齟齬が残る。
- 2026-03-16: すぐ着手しやすい高優先度候補は、`frontend/src/pages/login.vue` の legacy 直リンク解消、`workspace/forms` タブの実装、`staff/tags` と `staff/places` の CSV export 接続、`staff/circles/[circleId].vue` と Go API の participation type 可否整合。
- 2026-03-16: `frontend/src/pages/workspace/forms/index.vue` のタブは `?status=open|closed|all` を唯一の状態源にすると、legacy の 3 タブ導線を 1 API のまま再現できる。`open` は query 省略を既定にすると URL も短く保てる。
- 2026-03-16: `workspace/forms` の回帰テストでは open/closed/all それぞれで見えるフォーム名と router query を一緒に検証すると、見た目だけのタブへ戻る退行を防ぎやすい。
- 2026-03-16: `staff/tags` は migrated stack でも circle の `Tags` を使ってタグ別企画一覧 CSV を再構成できる。legacy の created/updated timestamps や yomi は現行 Go fixture/model では持っていないため、現状の export は migrated 契約に合わせた最小互換になる。
- 2026-03-16: `staff/places` の「場所別企画一覧」は現行 migrated stack に circle-place 紐付けが存在しないため未移行。UI をプレースホルダリンクのまま残さず、未対応理由を明示して誤操作を避けるのが安全。
- 2026-03-16: `@tanstack/query` の `invalidateQueries` は Promise を返すため、mutation の `onSuccess` では待つか `void` で明示的に捨てる。frontend の oxlint は no-floating-promises を厳格に見る。
- 2026-03-16: `frontend/typed-router.d.ts` は生成物でも `oxfmt` 監視対象なので、差分が残ると `frontend-check` が落ちる。手編集は避け、必要なら formatter を先に通す。
