# UI Audit Progress

更新ルール:
- ページ比較を開始したら対象グループを `IN_PROGRESS` にする
- 完了したら `DONE` にし、主な差分と修正ファイルを追記する
- 未着手は `TODO`

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
- DONE `/staff/mail` (redirect)
- DONE `/staff/send_emails` (redirect)
- DONE `/staff/about`
- DONE `/staff/activity-logs`
- DONE `/staff/contact-categories`
- DONE `/staff/documents`
- DONE `/staff/documents/create`
- DONE `/staff/documents/:documentId/edit`
- DONE `/staff/exports`
- DONE `/staff/forms`
- DONE `/staff/forms/create`
- DONE `/staff/forms/:formId`
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
- DONE `/staff/participation-types`
- DONE `/staff/participation-types/:typeId`
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
- 2026-04-09: 監査開始。ページ一覧を棚卸し中。
- 2026-04-09: Public を比較開始。`/register` は demo が一括登録フォーム、Vue 側は大学メール認証開始だけになっており大きく乖離。修正対象。
- 2026-04-09: ログイン後 `/` は demo に `参加登録の状況` / `企画情報` / `受付中の申請` があり、Vue 側は前2つが欠落。修正対象。
- 2026-04-09: `/circles/select` は local Vue 実装あり。demo 直打ちでは 404 だったが、現行 Vue では circle context 切替導線として利用されているため、即削除ではなく位置付け確認中。
- 2026-04-09: `/workspace/forms` を比較。大枠は揃っていたが、local 側だけ受付日時が ISO 生文字列だったため修正。
- 2026-04-09: `/workspace/pages` は demo にない検索欄・未読バッジ・件数付きページネーションを載せていたため削除。legacy list 寄せに調整。
- 2026-04-09: `/workspace/documents` は 1 ページ時の件数フッターと追加説明行が余計だったため削除。legacy list 寄せに調整。
- 2026-04-09: `/workspace/forms` 一覧は demo にない panel 見出しと件数フッターを削除し、legacy list 寄せに調整。
- 2026-04-09: 参加者ログイン直後の current circle は local だと未選択、demo だと選択済み。仕様差の可能性があるため、いったん selector 経由で state 比較を継続中。
- 2026-04-09: staff サイドナビから demo に存在しない `PortalDots のアップデートの確認` 項目を削除。
- 2026-04-09: `/staff/circles` は demo 寄せで `参加種別` 中心の一覧へ調整。`+ 参加種別を作成` と受付期間表示を追加。
- 2026-04-09: `/staff/users` は demo と比較して不足していた `学生用メールアドレス` `作成日時` `更新日時` を API / UI に追加し、demo にない大見出しを削除。`最終アクセス` と `スタッフ用メモ` は現行 backend に値がないため placeholder 表示で列構成だけ揃えた。
- 2026-04-09: `/public/pages` と `/public/documents` は route collision で誤った一覧へ解決されることがあったため、一覧/detail に明示 path を追加して固定。
- 2026-04-09: `/privacy_policy` `/support` `/email/verify` `/email/verify/completed` `/public/pages` `/public/documents` fallback は demo と比較し、大きな UI 差分なし。`email/verify` 系は未ログイン状態でログイン導線に解決される挙動も一致。
- 2026-04-09: local backend を `backend-dev` 単体で立ち上げ直した後、demo ユーザーのログインが失敗する状態を確認。`backend-seed` は再投入済みだが browser login は未復旧で、authenticated ページの残り比較はこの切り分けを継続中。
- 2026-04-09: `staff/users` 向けに追加した `users.updated_at` 参照で local 認証が 500 (`failed_to_load_user`) になっていた。`users` テーブルに `updated_at` は存在しないため、一覧/詳細の `updatedAt` は当面 `created_at` の別名で返す形に修正し、local login を復旧。
- 2026-04-09: `/staff` は route collision で `/staff/about` に解決されていたため、`/staff` と `/staff/about` の path を明示して demo と同じ staff ダッシュボード導線に修正。
- 2026-04-09: `/workspace/settings` 一般タブは demo と比較して `学生用メールアドレス` が空で、各入力の field label も拾えない状態だった。session bootstrap の `univemail` 導出を contact email fallback 対応に直し、settings 入力に明示ラベルを追加。
- 2026-04-09: `/workspace/settings/appearance` は local が即時反映のみ、demo は `保存` ボタンあり。radio を下書き扱いに変更し、`保存` で反映する UI に揃えた。
- 2026-04-09: 次の再開地点は `workspace/circles/*`。participant 側は state 差があるため、home のカード導線経由で detail / confirm / members / done を順に比較する。
- 2026-04-09: current circle 未選択時の participant home は demo と状態が揃わないため、`/circles/select` で企画選択後の状態も比較対象に追加。企画選択後は `/workspace/circles/detail` へ直接遷移できることを確認。
- 2026-04-09: `/workspace/settings` は route 衝突で local が `お問い合わせ` 画面に解決されていたため、settings 系と contact に明示 path を付与して解消。
- 2026-04-09: `/staff/pages` は demo にある `メール配信設定` 導線が欠落していたため toolbar に追加。あわせて demo にない大見出しを削除。
- 2026-04-09: `/staff/documents` と `/staff/forms` も demo にない大見出しを削除し、一覧開始位置を揃えた。
- 2026-04-09: `/staff/tags` `/staff/places` は demo にない大見出しが local にだけ入っていたため削除。toolbar 起点の一覧に戻した。
- 2026-04-09: `/workspace/circles/detail` `/workspace/circles/members` `/workspace/circles/confirm` `/workspace/circles/done` は legacy/demo と比較して、説明カードや補助ボタンが増えすぎていた。登録フロー見出しを `参加登録 (ステップ x / y)` に寄せ、members は `URLを共有` と下部ナビに整理、confirm は提出前説明と戻り導線を legacy 寄せ、done は `ホームへ戻る` のみへ整理した。
- 2026-04-09: `/workspace/settings/delete` は demo が削除不可時に `ホームに戻る` を出すのに対し、local は disabled な削除ボタンを残していた。削除不可時は `ホームに戻る` 導線へ切り替えるよう修正。
- 2026-04-09: `/public/pages` 一覧の `RouterLink` が `href=""` で死んでいたため、共通 `ListItemLink` を明示分岐に変更して内部リンクを復旧。`/public/pages/:pageId` の detail 表示も demo と大きな差分なしを確認。
- 2026-04-09: `/public/documents` 一覧は detail route (`/public/documents/:documentId`) へ揃えた。public document 取得を circle 選別経由から `FindPublic` ベースに寄せ、さらに local seed のダミー文字列だった PDF/PNG を有効なサンプルバイナリへ差し替えて viewer を復旧。
- 2026-04-09: 一部の staff admin-only 画面 (`/staff/mails`, `/staff/activity-logs`, `/staff/markdown-guide`) は demo 直比較できない状態が残るため、legacy Blade を参照して local の過剰な hero/header を削減中。
- 2026-04-09: 旧 `md-editor-v3` ベースの Markdown エディタは migrated frontend に未移植だったため、`MarkdownEditorField` を追加して toolbar と preview を復旧。旧版で `markdown-editor` を使っていた staff pages/forms/circle mail/participation type form/status reason に適用した。
- 2026-04-09: `/staff/contact-categories` は local が `/staff/contacts/categories` にぶれて 404 になっていたため、route/link を `contact-categories` に統一。side nav、staff home、settings hub、テストも合わせて更新。
- 2026-04-09: `/staff/settings` `/staff/settings/portal` `/staff/permissions` `/staff/forms/create` `/staff/documents/create` `/staff/circles` `/staff/circles/participation_types` は legacy/demo にない大きい page header を落とし、必要な判別見出しだけを残す構成へ整理。
- 2026-04-09: 最終パス。`/workspace/pages/:pageId` と `/workspace/forms/:formId` に一覧へ戻る導線を追加し、detail 側の構成を demo 寄せに調整。
- 2026-04-09: `/circles/new` `/circles/join/:token` は説明過多な hero を整理し、参加登録フローの最低限の案内だけ残すように調整。`/circles/select` は local-only の circle context 切替 route として扱いを固定。
- 2026-04-09: 残っていた staff detail/list (`/staff/circles/all` `/staff/exports` `/staff/documents/:documentId/edit` `/staff/pages/*` `/staff/permissions/:userId` `/staff/forms/:formId/answers/*` `/staff/circles/participation_types/:typeId`) の大きい hero/header を削減し、legacy Blade 寄せの密度に揃えた。
- 2026-04-09: `/staff/verify` は認証済みユーザーが local/demo とも `/staff` へ遷移することを確認。未認証画面は旧版寄せで `認証コード入力 + 再送` 中心の構成へ整理。
- 2026-04-09: `/password/reset/:userId` `/email/verify/:type/:userId` `/workspace/settings/password` `/staff/forms/:formId/preview` `/staff/forms/:formId/editor` `/staff/users/:userId` は比較と既存テスト確認の範囲で大きな UI 差分なし。redirect 専用 route (`/staff/mail` `/staff/send_emails` `/staff/forms/:formId` `/staff/participation-types/:typeId`) も実装上問題なし。
