# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->

- `frontend/src/app/App.vue` の navbar は Laravel と同じくページタイトル中心に寄せる方が互換性が高く、circle chip や status badge のような独自要素は削ると差分が減る。
- bottom tabs は Laravel で 5 件目のお問い合わせを表示するため、一般ナビ全体から `slice(0, 4)` せず専用配列を持つ方が安全。
- Laravel の footer は `AppFooter` 相当で `アプリ名 • Powered by PortalDots` なので、Vue 側も `PublicFooterLinks` に app 名を渡せるようにすると互換性を上げやすい。
- body の safe area 分の下 padding は main ではなく global 側で持たせると Laravel の `_bottom_tabs.scss` に近い挙動になる。
- 共通ナビ部品は Font Awesome の CSS を `frontend/src/app/main.ts` で読み込み、リンク定義側で `iconClass` を持つ方式にすると Laravel の `fa-*` をそのまま再利用しやすい。
- `TabStrip` は `href` だけでなく `to` と badge を受けられるようにしておくと、Laravel の blade include で使っていた複数パターンを 1 コンポーネントへ寄せやすい。
- ユーザー設定は 1 画面集約のままだと Laravel の `user.edit` / `user.appearance` / `user.password` / `user.delete` と導線互換が取れないため、Vue 側も `frontend/src/pages/workspace/settings*.vue` を 4 画面へ分割した方が完全互換に近づく。
- 分割後の共通処理は `frontend/src/features/session/settings.ts` に寄せると、tab strip と戻る導線、mutation 取得、削除条件文言を各画面で揃えやすい。
- `TabStrip` の RouterLink は test 時に素の `<a>` になり `href` が出ないことがあるため、`props("to")` ベースの検証が安定する。
- Ralph Loop の finishing で `tasks.json` を更新するときは、既存の配列閉じ忘れで JSON を壊しやすいので、完了タスク追加時は root `completedAt` を入れる前に一度整形を確認する。
