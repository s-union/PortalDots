# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->

- 2026-03-16: user 指示どおり開始前に `/.opencode/loop` を削除して新規 loop を再作成した。既存の repo には他作業の未コミット変更が多いので、以後の実装は touched file を最小化し、commit ごとに対象差分を明確に分ける。
- 2026-03-16: Portal 設定は `admin` 専用 capability として切り出し、既存 `staff/settings` 配下に `portal` page を追加するだけで安全に移せた。OpenAPI 型生成を使っているので、新 endpoint 追加時は `backend/api/openapi.yaml` と `packages/api-client/src/generated/schema.d.ts` の再生成が必須。
- 2026-03-16: participation type detail に一覧を戻すときは新 route を増やすより detail page に section を足す方が既存導線と自然に繋がる。circle 一覧は既存 `staffCircleResponse` をそのまま再利用でき、CSV も `writeCSV()` と既存 export の pattern で十分だった。
- 2026-03-16: 場所別企画一覧 CSV は migrated 側に `booths` 相当の place-circle relation が無いと legacy と同じ出力を作れない。`booths` table / sqlc query / booth repository / seed data を追加し、place 削除時と circle 削除時に relation も掃除することで、legacy と同じ multi-row CSV 形式を再現できた。
