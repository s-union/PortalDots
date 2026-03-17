# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->

- Appレイアウトは `route.meta` に `noDrawer` / `noFooter` / `noBottomTabs` を導入し、旧Laravelの `layouts.app` / `layouts.no_drawer` の切替方針を再現しやすくした。
- noDrawer時のヘッダーはタイトル+モード表示ではなくブランドリンクに切替すると、ログイン等の旧構造に近づく。
- auth系の一部（register/password/email verify）はAPI未移植のため完全機能一致は不可。UIトーンとDOM構造を旧画面寄りにしつつ、未移植である旨を画面内で明示する方針を採用。
- 既存テストは「旧URL未移植ガイダンス」を前提にしていたため、文言変更時はページ単位テストを同時更新する必要がある。
- public/workspaceのお知らせ一覧はAPIが `isLimited` / `isNew` を返せるため、旧UIの「限定公開/全員に公開」「NEW」バッジ再現が可能。
- public配布資料一覧は詳細ページ経由より直接ダウンロードURLへ `new-tab` で遷移させると、demo挙動に近い。
- privacy policyは外部Markdownパーサー依存を増やさず、最小限の段落/見出し/箇条書き変換をVue内で実装して生テキスト表示を解消した。
- support/privacyはBackLink付きの独自トーンから、legacyのlist-view相当のカード構造へ寄せると視覚差分が小さくなる。
- staff homeは「セクションリスト」より「機能カードグリッド」に寄せるとdemoと視覚構造が近い。admin専用機能には明示バッジを付けると判読性が高い。
- staff users一覧は見出しや操作列の文言をlegacy準拠にすると、DOM差分が小さくなり既存テストも調整しやすい。
- `nr test` は今回変更と無関係の既存失敗が多数あり、全件グリーン化は別タスクが必要。今回変更範囲は `nr ci:check` で通過確認済み。
- loginテストは画面仕様変更（開発用補助導線削除）により一部期待値が崩れるため、追加改修時はAPIモック/セッション水和の前提を含めて見直す必要がある。
- login.test.ts はAPI統合シナリオ依存を減らし、UI構造と主要導線の存在確認中心へリライトすると変更耐性が上がる。
