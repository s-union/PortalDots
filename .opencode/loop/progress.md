# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->

- `frontend/src/app/App.vue` の navbar は Laravel と同じくページタイトル中心に寄せる方が互換性が高く、circle chip や status badge のような独自要素は削ると差分が減る。
- bottom tabs は Laravel で 5 件目のお問い合わせを表示するため、一般ナビ全体から `slice(0, 4)` せず専用配列を持つ方が安全。
- Laravel の footer は `AppFooter` 相当で `アプリ名 • Powered by PortalDots` なので、Vue 側も `PublicFooterLinks` に app 名を渡せるようにすると互換性を上げやすい。
- body の safe area 分の下 padding は main ではなく global 側で持たせると Laravel の `_bottom_tabs.scss` に近い挙動になる。
