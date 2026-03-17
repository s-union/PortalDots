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
- ゲストホームは `frontend/src/features/public-home/api.ts` で `/v1/public/home` を引き、ログイン方法・公開参加登録・公開お知らせ・公開配布資料を 1 payload で描画すると demo に寄せやすい。
- ゲスト配布資料は認証必須の `/v1/documents/:id` を使えないため、`/v1/public/documents/:documentID` を別で生やし、フロントは `/public/documents/[documentId]` 経由でリダイレクトすると安全。
- 未ログイン時のユーザー設定は Laravel と同じく外観だけ見せるのが自然で、`buildUserSettingsTabs()` を認証状態で分岐させると `appearance` のみ表示できる。
- 今回の frontend unit test 失敗は主に各 test がローカル `QueryClient` を使う一方、router guard や一部 API フローが共有 `frontend/src/app/providers/queryClient.ts` を使っているズレが原因。mock を足すだけでは直らず、test helper 側の query client 注入や共有 client の reset が別タスクで必要。
- `frontend/src/pages/index.test.ts` と `frontend/src/pages/public/*` の今回の component test は、`fetch` を直接 stub するより composable (`usePublicHomeQuery`, `usePublicPagesQuery`, `usePublicDocumentsQuery` など) を module mock した方が安定する。route guard / Vue Query の評価タイミング差分を切り離せるため、画面レンダリングの検証に集中できる。
- localhost の `/v1/public/pages` と `/v1/public/documents` が 404 のときは、古い `go run` 生成バイナリが残っていることがある。`mise run backend-dev` 経由の残存 process を止めたうえで、`backend/` で `go run ./cmd/api` を直接再起動すると新ルートが反映された。
- 今回の比較対象は UI/CSS 差分であり、demo の文言・fixture 内容そのものを localhost へ移植する方針は採らない。内容差分は既知の前提として扱い、レイアウト・余白・タイポグラフィ・色・ボーダー・影・表示密度を優先して揃える。
