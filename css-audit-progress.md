# CSS Audit Progress

更新ルール:
- spacing の比較を始めたグループは `IN_PROGRESS`
- margin / padding / gap / card header / list spacing を見て、必要なら修正ファイルを追記する
- 文言差やデータ差は無視する

## Page Inventory

### Public
- DONE `/`
- DONE `/login`
- DONE `/register`
- DONE `/password/reset`
- DONE `/password/reset/:userId`
- DONE `/email/verify`
- DONE `/email/verify/:type/:userId`
- DONE `/email/verify/completed`
- DONE `/privacy_policy`
- DONE `/support`
- DONE `/public/pages`
- DONE `/public/pages/:pageId`
- DONE `/public/documents`
- DONE `/public/documents/:documentId`
- DONE fallback `/404-like ([...all])`

### Circle / Entry
- DONE `/circles/select`
- DONE `/circles/new`
- DONE `/circles/join/:token`

### Workspace
- DONE `/workspace`
- DONE `/workspace/pages`
- DONE `/workspace/pages/:pageId`
- DONE `/workspace/documents`
- DONE `/workspace/forms`
- DONE `/workspace/forms/:formId`
- DONE `/workspace/contact`
- DONE `/workspace/settings`
- DONE `/workspace/settings/appearance`
- DONE `/workspace/settings/password`
- DONE `/workspace/settings/delete`
- DONE `/workspace/circles/detail`
- DONE `/workspace/circles/confirm`
- DONE `/workspace/circles/members`
- DONE `/workspace/circles/done`

### Staff
- DONE `/staff`
- DONE `/staff/verify`
- DONE `/staff/mails`
- DONE `/staff/about`
- DONE `/staff/activity-logs`
- DONE `/staff/contact-categories`
- DONE `/staff/documents`
- DONE `/staff/documents/create`
- DONE `/staff/documents/:documentId/edit`
- DONE `/staff/exports`
- DONE `/staff/forms`
- DONE `/staff/forms/create`
- DONE `/staff/forms/:formId/edit`
- DONE `/staff/forms/:formId/editor`
- DONE `/staff/forms/:formId/preview`
- DONE `/staff/forms/:formId/not_answered`
- DONE `/staff/forms/:formId/answers`
- DONE `/staff/forms/:formId/answers/create`
- DONE `/staff/forms/:formId/answers/uploads`
- DONE `/staff/forms/:formId/answers/:answerId/edit`
- DONE `/staff/circles`
- DONE `/staff/circles/all`
- DONE `/staff/circles/:circleId`
- DONE `/staff/circles/:circleId/email`
- DONE `/staff/circles/participation_types`
- DONE `/staff/circles/participation_types/:typeId`
- DONE `/staff/circles/participation_types/:typeId/edit`
- DONE `/staff/circles/participation_types/:typeId/form/edit`
- DONE `/staff/pages`
- DONE `/staff/pages/create`
- DONE `/staff/pages/:pageId`
- DONE `/staff/permissions`
- DONE `/staff/permissions/:userId`
- DONE `/staff/places`
- DONE `/staff/settings`
- DONE `/staff/settings/portal`
- DONE `/staff/tags`
- DONE `/staff/users`
- DONE `/staff/users/:userId`
- DONE `/staff/markdown-guide`

## Notes
- 2026-04-09: CSS 監査開始。DOM 監査後の second pass として spacing を再確認する。
- 2026-04-09: `/register` は「メールアドレス確認を先に行う」新フローが意図された差分として扱う。demo と完全一致は追わず、container 幅と余白のみ調整。
- 2026-04-09: global CSS で `required` 属性から自動生成していた `必須` バッジを削除。旧版にない余白差を多くのフォームで生んでいたため。
- 2026-04-09: public auth 共通では `login` を旧 narrow 幅へ、`password reset` を button outside card の密度へ修正。
- 2026-04-09: shared shell では header の二段見出しをやめ、drawer 冒頭の `スタッフモード` / `デモサイト` 表示を demo 寄せに再配置。
- 2026-04-09: `PageMarkdownContent` に list-style を復活させ、public/workspace のお知らせ detail を card 囲みから legacy に近い header + 本文構成へ戻した。
- 2026-04-09: local frontend dev は途中から `127.0.0.1:5173` で再起動して比較を継続。backend は `127.0.0.1:8080` の既存プロセスに接続している。
- 2026-04-10: `support` / `privacy_policy` / fallback / `circles/select` / `workspace/contact` / `staff/verify` は legacy Blade の list-view 密度に寄せて再調整。
- 2026-04-10: demo 側で direct open が 404 になる route (`workspace/*`, `staff/settings*` など) は、認証後 local 実画面に加えて legacy Blade または共通コンポーネント単位で spacing を確認して close。
- 2026-04-10: `/public/documents/:documentId` は redirect 後の PDF/viewer 依存が強く、アプリ側としては「開いています…」中継画面の余白のみ確認して close。
