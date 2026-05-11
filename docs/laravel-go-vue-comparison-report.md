# Laravel → Go+Vue 移行 比較レポート

## 未移行のLaravelコード（完全欠落）

| # | 対象 | 詳細 |
|---|------|------|
| 1 | **インストールウィザード全体** | `routes/install.php` 全10エンドポイント、`app/Http/Controllers/Install/`以下全10コントローラ、`app/Services/Install/`以下全5サービスが未移行 |
| 2 | **パスワードリセット** | Go旧コード(`auth_password_reset.go`)に実装済だが、新server (`http/server/routes.go`) に配線されていない。`POST /auth/password/reset/start`, `/verify`, `/complete` が利用不可 |
| 3 | **メールリンク本人確認** | `POST /auth/verification/verify` が新Goルートに不在。Vue側はAPIを呼んでいるがバックエンド不在 |
| 4 | **リリース情報/バージョンチェック** | `ReleaseInfoService`, `Version`, `Release` 値オブジェクト未移行。Vue `about.vue` はハードコード |

---

## 領域別 比較サマリー

### Auth（登録・ログイン・認証）

**一致:** 登録後の自動ログイン、学籍番号/メール重複チェック、Remember Me、ユーザー列挙対策(常に成功メッセージ)

**差異:**
- `name_yomi` にひらがな/カタカナ制限がない（Go `helpers.go:114`）Laravel: `[ぁ-んァ-ヶー]`
- Emailバリデーションが `@`を含むのみの緩いチェック（Go `helpers.go:31`）Laravel: `FILTER_VALIDATE_EMAIL`
- パスワードに英字+数字必須を追加（Go `helpers.go:38`）Laravel: min:8のみ
- 直接登録(`register()`)で確認メール未送信 → 多段階登録のみ対応（`auth_registration.go:164`）
- `univemail_local_part` の `same:student_id` ルール未実装
- 登録完了判定: Laravelは両メール認証必要、Goはunivemailのみで完了（`helpers.go:72`）
- `setSignedUpAt` 未実装
- ログアウト時のスタッフモード/企画選択解除なし
- 多段階登録 (start→verify→complete) はGoのみの新機能

### Workspace Pages / Documents

**一致:** 認証+企画選択、検索、タグフィルタ、公開のみ、"NEW"バッジ(72時間)、既読/未読、10件ページネーション、Markdownレンダリング(Vue側)、ファイルダウンロード、基本CRUD

**差異:**
- Goはメモリ内ページネーション（全件取得→スライス）Laravel: DBレベル `paginate(10)`（`pages.go:162`）
- 全文検索互換性チェックなし（Go）
- ページオーバーフロー時リダイレクトなし（Goはページ番号キャップのみ `pages.go:174`）
- 文書一覧に既読トラッキング+"NEW"バッジあり（Go新機能）
- Workspace文書ダウンロードに `Content-Disposition` なし（`documents.go:78`）
- 公開お知らせ/文書はGoのみの完全新機能（Laravelでは全認証必須）
- `backend/internal/http/workspace/` は `//go:build ignore` でデッドコード

### Workspace Forms / Answers

**一致:** フォーム一覧、回答CRUD、設問バリデーション、ファイルアップロード/ダウンロード、max_answers超過チェック

**差異:**
- Goはページネーションなし全件返却（`forms.go:44`）
- open/closedフィルターがサーバーサイド→クライアントサイドに移動
- フォーム割り当て: Laravelはタグのみ、GoはCircleID直接指定+タグ両方
- Hidden questions (`"申請ページ"`, `"申請企画名"`) をフィルター（Go新機能 `workspace_form_helpers.go:17`）
- `currentCircleStatus` による書き込み不可判定（Go新機能）
- max_answers超過時に409 Conflict応答（Go新機能）
- メール通知: GoはCloudflare Email非同期、Laravelは同期的
- フォーム作成者への `【スタッフ用控え】` 通知なし（Go未実装）
- `confirmationMessage` 表示対応（Go新機能）
- ファイルサイズ上限5MB（Go明示的、`form_answer_context.go:41`）

### Workspace Circles

**一致:** 企画CRUD、参加種別表示、メンバー管理、招待トークン、企画選択、回答upsert

**差異（高重要度）:**
- **Circle Auth（再認証）完全未実装**: 提出済み企画詳細が再認証なしで閲覧可能
- **`addCurrentCircleMember` がスタブ**: 招待トークン経由のメンバー追加が常に403（`circles_handlers.go:514`）
- `approved()` チェックなしで選択可能（セレクター）
- オープンリダイレクト対策なし（セレクター）
- Doneページのセッションガードなし
- `canCreateCircleRegistration`: Goは初回作成か既存リーダーのみに制限（Laravelより厳格）
- QRコード: Laravelはサーバー生成、Goはクライアント生成(uqr)
- 削除フロー: Laravelは2段階(確認→削除)、Goは1段階(window.confirm)

### Staff Pages / Documents

**一致:** CRUD基本操作、ピン留め、CSVエクスポート、権限チェック、title/body必須バリデーション

**差異:**
- **文書データモデルが根本的に異なる**: LaravelではDocumentsは企画非依存。Goでは必ず `CircleID` を持つ
- Pin時の `updated_at` 更新: Laravelは `timestamps=false` で更新しない、Goは更新する可能性
- メール送信Markdown→プレーンテキストに簡略化
- 文書IDの存在バリデーションあり（Go新機能 `staff_pages.go:366`）
- ページ削除時のviewableTags detachなし（Go）
- Go全操作でActivityLog記録（Laravel未実装）

### Staff Forms / Answers / Editor

**一致:** Forms/Answers/Editor全CRUD、ファイルアップロード/ダウンロード、ZIPダウンロード、エクスポート、複製、設問並べ替え

**差異:**
- Go認可: 8種の細粒度capability。Laravel: `FormRequest::authorize()` が常に `true`
- デモモード未実装（Laravel `AddQuestionAction:22`）
- 参加登録フォームの固定設問未実装（Laravel `GetQuestionsAction:31`）
- 回答更新時の `circle.submitted` チェックなし
- 回答作成時に `409 Conflict` 応答（Go新機能）
- 全操作でActivityLog記録（Go新機能）
- フォーム複製が設問・順序まで完全コピー（Go `staff_forms.go:289`）

### Staff Circles / ParticipationTypes

**一致:** 企画CRUD、参加種別CRUD、メール送信、エクスポート、ステータス変更通知

**差異:**
- `name_yomi`/`group_name_yomi` のひらがな正規表現バリデーションなし（Go `staff_circles_helpers.go:56,62`）
- `leader` の学籍番号DB存在チェックなし
- メンバー未登録/未認証カスタムバリデーションなし
- スタッフ控えBCC未実装（Laravel `SendAction:44`）
- 参加種別作成時のデフォルト確認メッセージ未実装
- **Vue側**: ParticipationTypesの作成/更新/削除API呼び出し関数とmutation hookが存在しない（読み取りのみ）
- 「参加種別未設定の企画に限り一度だけ設定可能」制限なし（Go）

### Staff Users / Permissions

**一致:** ユーザーCRUD、ロール更新、本人確認、権限一覧/編集、スタッフ認証フロー(5分TTL)

**差異:**
- **認可モデルの根本的差異**: Laravelは `is_admin/is_staff` bool。Goはcapabilityベース集中管理（`staff_access.go:37`）
- ユーザーデータモデル: `name`(スペース) → `firstName/lastName`分割 + `displayName`
- Goの自己削除禁止・admin削除制限あり（Laravel未実装）
- 他ユーザー情報変更時のセッション破棄あり（Go新機能 `staff_users_helpers.go:131`）
- 認証コードの平文保存（Go `staff_verify.go:67`）→ `ConstantTimeCompare` で対策
- 欠落: `notes`フィールド、氏名正規表現、学籍番号/メール一意性バリデーション、学内メール形式、`is_verified_by_staff`フラグ

### Staff Masters (Tags / Places / ContactCategories)

**一致:** 基本CRUD、Places CSVエクスポート

**差異:**
- **Tags/Placesのnameユニーク制約なし**（Go `staff_masters.go:153,406`、高重要度）
- ContactCategoriesのemail検証が `@` のみ（弱すぎる `staff_masters.go:426`）
- Tags CSV: 9カラム→7カラムに減少（`created_at`/`updated_at`欠落 `staff_masters.go:102`）
- ContactCategories更新時にメール変更の有無に関わらず常にメール送信（Go `staff_masters.go:375`）
- Export権限: Laravelは独立export権限、Goはread権限と兼用
- Go全操作でActivityLog記録（Laravel未実装）
- メール送信: Laravel同期→Go非同期Cloudflare Email Queue

### Staff Admin (ActivityLogs / Mails / Exports / Portal)

**ActivityLogs:**
- Goはインメモリのみ（再起動で消失 `activitylog/repository.go:30`）。LaravelはDB永続化
- フィルタリング・ソート・Actor名列挙なし（Go）
- 認可: Laravelはadmin限定、Goはcapabilityベース（緩和）

**Mails:**
- 削除機能なし（Laravel `DestroyAction` 相当なし）
- サービス稼働監視(`isServiceOperational`)なし
- Vue: 一覧表示のみ。送信フォームUI未完成

**Exports:**
- 設計が異なる: Laravelはリソース別個別CSV(9種)、Goは全リソース統合CSV+ZIP(2種)
- Goに不足: リソース別個別CSVエクスポート
- Go独自: UTF-8 BOM、外部ID書き換え、ZIPバンドル

**PortalSettings:**
- `portalDescription`, `appForceHttps` バリデーション未チェック
- `univemailLocalPart` が `student_id` のみに厳格化（`user_id` 非許容）

---

## セッション/ミドルウェア 差異

- `CheckSelectedCircle`: ミドルウェアではなく`session_bootstrap`内で解決（設計差）
- `EnsureEmailIsVerified`: フロントエンド側で対応（設計差）
- `UpdateLastAccessedAt`: 未実装
- `TrimStrings`: 各ハンドラで`strings.TrimSpace`個別適用（部分的）
- Go独自: 外部IDエンコード/デコード(`external_ids.go`)、構造化アクセスログ、IPレート制限、セッション他端末破棄

---

## デッドコード警告

以下のディレクトリはすべて `//go:build ignore` でコンパイル除外:
- `backend/internal/http/public/`
- `backend/internal/http/workspace/`
- `backend/internal/http/staff/`
- `backend/internal/http/shared/`

実際に使われているのは `backend/internal/controllers/` 側。両者で一部ロジック差異あり。

---

## 優先度別 重要差異一覧

### 高優先度（要修正）
1. `name_yomi` にひらがな/カタカナ制限なし（`helpers.go:114`）
2. 直接登録(`register`)で確認メール未送信（`auth_registration.go:164`）
3. `addCurrentCircleMember` がスタブ（`circles_handlers.go:514` 常に403）
4. Circle Auth（再認証）完全未実装
5. パスワードリセット新サーバー未配線
6. `POST /auth/verification/verify` が新Goルートに不在
7. Tags/Placesのnameユニーク制約なし（`staff_masters.go:153,406`）
8. Emailバリデーションが `@` のみの緩いチェック（`helpers.go:31`, `staff_masters.go:426`）
9. ActivityLogsがインメモリのみ（DB永続化なし）
10. 文書データモデルの根本的差異（GoでCircleID必須）

### 中優先度（挙動差あり）
11. `univemail_local_part` の `same:student_id` 未実装
12. 登録完了判定: univemailのみ vs 両メール認証
13. パスワード英字+数字必須の追加（仕様変更？）
14. スタッフ控えBCC未実装
15. ContactCategories更新時メール常時送信
16. 参加登録フォームの固定設問未実装
17. デモモード未実装

### 低優先度（改善推奨）
18. Goは全件メモリ内ページネーション（パフォーマンス）
19. `setSignedUpAt` 未実装
20. Tags CSVカラム減少（`created_at`/`updated_at`欠落）
21. ログアウト時のスタッフモード/企画選択解除なし
22. ParticipationTypesのmutation APIがVue側に未実装（読み取りのみ）
23. `portalDescription`/`appForceHttps` バリデーション未チェック
