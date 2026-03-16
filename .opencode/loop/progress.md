# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->

- 2026-03-17: loop state が消されていたので再作成して開始。既存 worktree には他変更が多いため、今回の修正は `frontend/src/pages/[...all]*` と認証案内ページ周辺に限定して差分を分ける。
- 2026-03-17: `nr test -- src/pages/[...all].test.ts ...` は zsh の glob 展開で失敗した。角括弧を含むパスは必ずクォートして実行する。
- 2026-03-17: 旧URL互換は案内カードを維持するより catch-all 404 に一本化した方が「移植しない」方針を明確に伝えられる。関連 composable と `_legacy` コンポーネント群も丸ごと削除できた。
- 2026-03-17: auth 系は API 未実装よりも「メール設計未確定のためモック案内のみ」という方針を明言した方が、staff verify / contact / mail queue の既存表現とそろう。
- 2026-03-17: follow-up checks では今回導入した TODO/FIXME は見つからず、`mise run check` と `frontend/nr test` も通過した。`frontend/src/app/router/index.test.ts` の auth route guard も既存のままで整合していたため追加修正は不要だった。
