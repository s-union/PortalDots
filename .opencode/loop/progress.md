# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->

- Appレイアウトは `route.meta` に `noDrawer` / `noFooter` / `noBottomTabs` を導入し、旧Laravelの `layouts.app` / `layouts.no_drawer` の切替方針を再現しやすくした。
- noDrawer時のヘッダーはタイトル+モード表示ではなくブランドリンクに切替すると、ログイン等の旧構造に近づく。
