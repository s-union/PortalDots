# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->

- `docs/laravel-vue-go-migration-mapping.md` を新規作成し、Laravel 側パスを repo-relative で統一した。
- 対応表は原則 1 ファイル 1 行まで展開し、`Laravel path | Status | New paths | Notes` 形式にそろえた。
- 主な未移行領域は install、register/password reset/email verify の backend、本番メール送信、reads、Laravel 固有の middleware/provider/responder/grid/filter 基盤。
- 画像資産と `frontend/public` 相当の配置先は明示的な移行先を確認できず、未対応として整理した。
