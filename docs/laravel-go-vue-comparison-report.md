# Laravel → Go+Vue 移行 比較レポート

## 未移行のLaravelコード（完全欠落）

| # | 対象 | 詳細 |
|---|------|------|
| 1 | **インストールウィザード全体** | `routes/install.php` 全10エンドポイント、`app/Http/Controllers/Install/`以下全10コントローラ、`app/Services/Install/`以下全5サービスが未移行 |
| 2 | **パスワードリセット** | Go旧コード(`auth_password_reset.go`)に実装済だが、新server (`http/server/routes.go`) に配線されていない。`POST /auth/password/reset/start`, `/verify`, `/complete` が利用不可 |
| 3 | **メールリンク本人確認** | `POST /auth/verification/verify` が新Goルートに不在。Vue側はAPIを呼んでいるがバックエンド不在 |
| 4 | **リリース情報/バージョンチェック** | `ReleaseInfoService`, `Version`, `Release` 値オブジェクト未移行。Vue `about.vue` はハードコード |

---

## ファイル単位 詳細比較

### 凡例

- 🔴 **高優先度**: セキュリティ・データ整合性・機能欠落
- 🟡 **中優先度**: 挙動差・バリデーション差異
- 🟢 **低優先度**: 改善推奨・表示の差異
- ✅ **解決済み**

---

### Auth（登録・ログイン・認証）

#### Go: `backend/internal/controllers/auth.go` ↔ Laravel: `app/Http/Controllers/Auth/LoginController.php`

| # | 優先度 | 差異 | Go | Laravel |
|---|--------|------|-----|---------|
| A1 | 🔴 | ログアウト時のスタッフ認証解除 | **欠落** (`auth.go:89-107`) | `LoginController.php:89-90`: `$this->staffAuthService->forget()` |
| A2 | 🔴 | ログアウト時の企画セレクターリセット | **欠落** (`auth.go:89-107`) | `LoginController.php:92-93`: `$this->selectorService->reset()` |
| A3 | 🟡 | ログアウト確認ページ(`GET /logout`) | **欠落** (Go: POSTのみ) | `LoginController.php:76-78`: `view('auth.logout')` |
| A4 | 🔴 | ログイン試行スロットリング | **欠落** | Laravel: `HasThrottleLogins` トレイト |
| A5 | 🟡 | Remember Me (永続ログイン) | Cookie TTL設定のみ (`auth.go:80-83`) | `remember_token` テーブル列 + `AuthenticatesUsers` |
| A6 | 🔴 | CSRF保護 | **欠落** | Laravel: `VerifyCsrfToken` ミドルウェア |

#### Go: `backend/internal/controllers/auth_registration.go` ↔ Laravel: `app/Http/Controllers/Auth/RegisterController.php` + `app/Services/Auth/RegisterService.php`

| # | 優先度 | 差異 | Go | Laravel |
|---|--------|------|-----|---------|
| A7 | 🔴 | `univemail_domain_part` の設定値検証 | **欠落** - domain partがconfigと一致するか検証しない (`auth_registration.go:89-91`) | `User.php:109-112`: `Rule::in(config('portal.univemail_domain_part'))` |
| A8 | 🔴 | `univemail_local_part` の `same:student_id` ルール | **欠落** | `User.php:105-108`: configが `student_id` の場合にクロスフィールド検証 |
| A9 | 🟡 | 構築後univemailの形式検証 | **欠落** (`auth_registration_helpers.go:180-187`) | `User.php:119-122`: `filter_var($univemail, FILTER_VALIDATE_EMAIL)` |
| A10 | 🟡 | 登録メール失敗時のトランザクションロールバック | **欠落** (トランザクション境界なし) | `RegisterController.php:89,110-116`: `DB::beginTransaction()` / `DB::rollBack()` |
| A11 | 🔴 | 登録直後のメール送信対象 | 連絡先emailのみ (`auth_registration.go:289-298`) | **両方**(univemail + 連絡先email) (`EmailService.php:21-25`) |
| A12 | 🔴 | 認証URL有効期限 | **5分固定** (`auth_registration.go:18`) | **60分** (config可変) (`EmailService.php:87`) |
| A13 | 🟡 | `signed_up_at` 設定 | **欠落** | `VerifyAction.php:45`: `$user->setSignedUpAt()` |
| A14 | 🟡 | `Registered` イベント発火 | **欠落** | `RegisterController.php:102` |
| A15 | 🟡 | `is_verified_by_staff` フィールド | **欠落** | `User.php:77` |
| A16 | ✅ | パスワード英字+数字必須 | 実装済 (`auth_registration.go:217-218`) | min:8のみ |
| A17 | ✅ | 直接登録エンドポイント | 削除済 (多段階登録のみ) | `POST /register` |
| A18 | 🟡 | 登録完了判定 | univemailのみで完了 (`auth_registration_helpers.go:82`) | 両メール認証必要 (`User.php:322-325`) |

#### Go: `backend/internal/controllers/auth_password_reset.go` ↔ Laravel: `app/Services/Auth/ResetPasswordService.php`

| # | 優先度 | 差異 | Go | Laravel |
|---|--------|------|-----|---------|
| A19 | 🟢 | 署名付きURL vs トークン | トークンベース(メモリ内ストア) | `URL::temporarySignedRoute()` で暗号的署名 |
| A20 | 🟢 | パスワード変更後全セッション無効化 | 実装済 (`auth_password_reset.go:178`) | **していない** |
| A21 | 🟢 | パスワード変更通知メール | 実装済 (`auth_password_reset.go:173`) | **していない** |
| A22 | 🟢 | アクティビティログ記録 | 実装済 (`auth_password_reset.go:179-188`) | **していない** |

#### Go: `backend/internal/controllers/auth_verification_token_store.go` ↔ Laravel: `app/Services/Auth/EmailService.php`

| # | 優先度 | 差異 | Go | Laravel |
|---|--------|------|-----|---------|
| A23 | 🟡 | 認証再送 | 1typeにつき1通 (`auth_registration.go:320-370`) | 両方同時に再送 (`ResendAction.php:22-28`) |

---

### Circles（企画管理）

#### Go: `backend/internal/controllers/circles.go` + `circles_handlers.go` + `circles_helpers.go` ↔ Laravel: `app/Http/Controllers/Circles/*`

| # | 優先度 | 差異 | Go | Laravel |
|---|--------|------|-----|---------|
| C1 | 🔴 | `GET /circles/join/{token}` ルートの配線漏れ | `RegisterWorkspaceRoutes` で `GetCircleByInvitationToken` が登録されていない (`circles_handlers.go:653`) | `InviteAction.php:22`: 招待トークン情報取得 |
| C2 | 🔴 | 提出済み企画の招待トークンチェック | **欠落** - 提出済みでも招待情報を取得可能 (`circles_handlers.go:653-678`) | `InviteAction.php:22`: `!$circle->hasSubmitted()` |
| C3 | 🟡 | 既存メンバーの招待ページリダイレクト | **欠落** (リーダー/非リーダー分岐なし) (`circles_handlers.go:653-678`) | `InviteAction.php:28-36`: リーダー→members, 非リーダー→show |
| C4 | 🟡 | 削除確認ページ (`circles.delete`) | **欠落** (ブラウザ `confirm()` で代用) | `DeleteAction.php:24-25`: Blade確認ページ |
| C5 | 🟡 | Doneページセッションガード | **欠落** (常時アクセス可能) | `DoneAction.php:13-16`: `session()->has('done')` |
| C6 | 🔴 | `name_yomi` / `group_name_yomi` の正規表現バリデーション | **欠落** (`circles_handlers.go:176-181,209-212`) | `CircleRequest.php:33-36`: `regex:/^([ぁ-んァ-ヶー]+)$/u` |
| C7 | 🟡 | `name`/`name_yomi`/`group_name`/`group_name_yomi` の最大255文字制限 | **欠落** | `CircleRequest.php:33-36`: `max:255` |
| C8 | 🔴 | 参加種別フォームのカスタムバリデーション | **欠落** (基本バリデーションのみ) (`circles_handlers.go:222-225`) | `CircleRequest.php:39-44`: `ValidationRulesService` 経由で動的ルール追加 |
| C9 | 🟡 | `last_updated_timestamp` の整数型検証 | 空文字チェックのみ (`circles_handlers.go:458`) | `SubmitRequest.php:27`: `integer` ルール |
| C10 | 🔴 | 提出時のタグ同期 (`syncWithoutDetaching`) | **欠落** (`circles_handlers.go:499`) | `CirclesService.php:119-122`: 参加種別に紐づくタグを企画に同期 |
| C11 | 🟡 | メール送信形式 | 全メンバーに同一平文メール (`circles_handlers.go:513-533`) | `SubmittedMailable` クラスでユーザー毎にHTMLメール |
| C12 | 🟡 | 責任者削除防止の明示的エラーメッセージ | 無し (`circles_handlers.go:604-624`) | `DestroyAction.php:24-29`: 「責任者は削除できない」 |
| C13 | 🟡 | 非リーダーの他メンバー削除制限 | 一律 `ErrForbidden` (`circles_handlers.go:618`) | `DestroyAction.php:31-36`: 自分自身のみ削除可能 |
| C14 | 🟡 | `can_change_group_name` 基準のリダイレクト分岐 | `usersCountMax > 1` 基準 (`circles_handlers.go:150`) | `StoreAction.php:62-70`: `can_change_group_name` 基準 |
| C15 | 🟢 | アクティビティログ無効化/再有効化 | **欠落** | `StoreAction.php:33-73`: 各所で `activity()->disableLogging()` |
| C16 | ✅ | Circle Auth（再認証） | `POST /circles/current/auth` + `GET /circles/current/detail` で実装済 | `Auth/PostAction.php` + `Auth/ShowAction.php` |
| C17 | ✅ | `addCurrentCircleMember` | リーダー権限・ユーザー存在・未認証チェック実装済 | `Users/StoreAction.php` |
| C18 | 🟡 | `approved()` チェックなしで選択可能 | セレクターに制限なし | 制限なし（同等） |
| C19 | 🟡 | オープンリダイレクト対策 | **欠落** (セレクター) | 未実装（同等） |
| C20 | 🟡 | `canCreateCircleRegistration` | 初回作成か既存リーダーのみ (`circles_registration.go`) | 同等（Laravelより厳格） |

#### Vue ↔ Blade UI差異 (Circles)

| # | 優先度 | 差異 | Vue | Blade |
|---|--------|------|-----|-------|
| C21 | 🔴 | 企画詳細「この企画から抜ける」ボタン | **欠落** (`detail.vue`) | 非リーダー向けに表示 (`show.blade.php`) |
| C22 | 🔴 | 不受理理由のMarkdown表示 | **欠落** (`detail.vue`) | rejected時に `$circle->status_reason` を表示 (`show.blade.php`) |
| C23 | 🟡 | 提出後確認メッセージ表示 | **欠落** (詳細画面) (`detail.vue`) | `confirmation_message` を表示 (`show.blade.php`) |
| C24 | 🔴 | セレクター未提出企画の警告セクション | **欠落** (`select.vue`) | 未提出企画リスト + 警告メッセージ (`selector.blade.php`) |
| C25 | 🟡 | 企画ID表示（Doneページ） | **欠落** (`done.vue`) | 「企画ID: {{ $circle->id }}」 (`done.blade.php`) |
| C26 | 🟡 | メンバー一覧 学籍番号表示 | `displayName` のみ (`members.vue`) | `student_id` を表示 (`users/index.blade.php`) |
| C27 | 🟡 | 役割バッジ文言 | 「リーダー」「メンバー」 | 「責任者」「学園祭係(副責任者)」 |
| C28 | 🟡 | 確認画面 設問のリーダー編集リンク | **欠落** (`confirm.vue`) | リーダーに「下記回答の変更」リンク (`confirm.blade.php`) |
| C29 | 🟡 | 提出時楽観的ロック不一致の詳細説明 | バリデーションエラーJSONのみ | 詳細flashメッセージ (`SubmitAction.php:40-47`) |

---

### Workspace Pages / Documents

#### Go: `backend/internal/controllers/pages.go` + `documents.go` ↔ Laravel: `app/Http/Controllers/Pages/*` + `Documents/*`

| # | 優先度 | 差異 | Go | Laravel |
|---|--------|------|-----|---------|
| W1 | ✅ | DBレベルページネーション | COUNT+LIMIT/OFFSET 実装済 | 同一 |
| W2 | 🟡 | 全文検索互換性チェック | **欠落** | `PagesService` / `DocumentsService` に存在 |
| W3 | ✅ | ページオーバーフロー正規化 | 実装済 | 同一 |
| W4 | 🟢 | 文書ダウンロード `Content-Disposition` | **欠落** (`documents.go:78`) | 設定あり |
| W5 | 🟢 | 既読トラッキング+"NEW"バッジ | Go新機能 (実装済) | なし |
| W6 | 🟢 | 公開お知らせ/文書 | Go新機能 (実装済) | 全認証必須 |

#### Vue ↔ Blade UI差異 (Pages/Documents)

| # | 優先度 | 差異 | Vue | Blade |
|---|--------|------|-----|-------|
| W7 | 🟡 | お知らせ一覧の既読/未読表示 | **欠落** (`workspace/pages/index.vue`) | 表示あり (`pages/list.blade.php`) |
| W8 | 🟢 | 「NEW」バッジ | 実装済 (新機能) | なし |

---

### Workspace Forms / Answers

#### Go: `backend/internal/controllers/forms.go` + `form_answer_*.go` ↔ Laravel: `app/Http/Controllers/Forms/*` + `app/Services/Forms/*`

| # | 優先度 | 差異 | Go | Laravel |
|---|--------|------|-----|---------|
| F1 | 🟡 | フォーム割り当て | CircleID直接指定+タグ両方 | タグのみ |
| F2 | 🟢 | Hidden questions フィルター | Go新機能 (`workspace_form_helpers.go:17`) | なし |
| F3 | 🟢 | `currentCircleStatus` による書き込み不可判定 | Go新機能 | なし |
| F4 | 🟢 | max_answers超過時 409 Conflict | Go新機能 | なし |
| F5 | 🟡 | メール通知方式 | Cloudflare Email非同期 | 同期的 |
| F6 | 🔴 | フォーム作成者への `【スタッフ用控え】` 通知 | **欠落** | `AnswersService` に存在 |
| F7 | 🟢 | `confirmationMessage` 表示対応 | Go新機能 | なし |
| F8 | 🟢 | ファイルサイズ上限 5MB | 明示的 (`form_answer_context.go:41`) | PHP設定依存 |

#### Vue ↔ Blade UI差異 (Workspace Forms)

| # | 優先度 | 差異 | Vue | Blade |
|---|--------|------|-----|-------|
| F9 | 🟡 | フォーム一覧 Tabstrip | `TabbedSettingsPage` で実装 | route nameでアクティブ状態判定 (`forms/list.blade.php`) |
| F10 | 🟡 | 以前の回答一覧表示 (新規作成時) | コンポーネント依存 | 既存回答一覧を表示 (`forms/answers/form.blade.php`) |
| F11 | 🟡 | 回答数上限メッセージ | コンポーネント依存 | 「あとNつ」「上限に達した」を表示 |
| F12 | 🟡 | 編集時 確認メッセージ表示 | コンポーネント依存 | `confirmation_message` を表示 |

---

### Staff Pages / Documents

#### Go: `backend/internal/controllers/staff_pages.go` + `staff_documents.go` ↔ Laravel: `app/Http/Controllers/Staff/Pages/*` + `Documents/*`

| # | 優先度 | 差異 | Go | Laravel |
|---|--------|------|-----|---------|
| SP1 | ✅ | サーバーサイド検索・絞り込み | 実装済 | 同一 |
| SP2 | ✅ | Documents から CircleID 削除 | 削除済 (`staff_documents.go`) | 企画非依存 |
| SP3 | 🟡 | Pin時の `updated_at` 更新 | 更新する可能性あり | `timestamps=false` で更新しない (`PatchPinAction.php`) |
| SP4 | 🟡 | メール送信 Markdown→プレーンテキスト | 簡略化 (`staff_pages.go:484-524`) | BladeテンプレートでMarkdownレンダリング |
| SP5 | 🟢 | 文書ID存在バリデーション | Go新機能 (`staff_pages.go:366`) | なし |
| SP6 | 🟡 | ページ削除時の viewableTags detach | **欠落** | `PagesService` に存在 |
| SP7 | 🟢 | 全操作 ActivityLog 記録 | Go新機能 | なし |

#### Vue ↔ Blade UI差異 (Staff Pages/Documents)

| # | 優先度 | 差異 | Vue | Blade |
|---|--------|------|-----|-------|
| SP8 | 🟡 | お知らせフォーム メール配信チェックボックス | コンポーネント依存 (`StaffPageEditorForm.vue`) | `send_emails` + CRON説明 (`staff/pages/form.blade.php`) |
| SP9 | 🟡 | お知らせフォーム 配布資料の新規作成リンク | コンポーネント依存 | リンク表示 (`staff/pages/form.blade.php`) |
| SP10 | 🟢 | 配布資料フォーム 閲覧可能タグ | `StaffTagPicker` 追加 (正の差異) | なし |
| SP11 | 🟡 | 配布資料フォーム ファイル必須バッジ | **欠落** | 「必須」バッジ表示 (`staff/documents/form.blade.php`) |
| SP12 | 🟡 | 配布資料編集時 既存ファイル表示 | **欠落** (新規作成画面のみ) | ファイルリンク+サイズ+形式表示 (`staff/documents/form.blade.php`) |

---

### Staff Forms / Answers / Editor

#### Go: `backend/internal/controllers/staff_forms*.go` + `staff_form_answers*.go` ↔ Laravel: `app/Http/Controllers/Staff/Forms/*`

| # | 優先度 | 差異 | Go | Laravel |
|---|--------|------|-----|---------|
| SF1 | 🟢 | 認可: 8種の細粒度capability | Go新機能 (`staff_access.go`) | `FormRequest::authorize()` が常に `true` |
| SF2 | 🔴 | デモモード | **欠落** | `AddQuestionAction:22`: デモデータ |
| SF3 | 🔴 | 参加登録フォームの固定設問 | **欠落** | `GetQuestionsAction:31`: 固定設問リスト |
| SF4 | 🟡 | 回答更新時の `circle.submitted` チェック | **欠落** | `Answers/UpdateAction.php` に存在 |
| SF5 | 🟢 | 回答作成時 409 Conflict | Go新機能 | なし |
| SF6 | 🟢 | 全操作 ActivityLog 記録 | Go新機能 | なし |
| SF7 | 🟢 | フォーム複製 設問・順序完全コピー | Go新機能 (`staff_forms.go:289`) | なし |

#### Vue ↔ Blade UI差異 (Staff Forms)

| # | 優先度 | 差異 | Vue | Blade |
|---|--------|------|-----|-------|
| SF8 | 🔴 | 回答一覧グリッドの設問列 | **欠落** (「提出した企画」「作成日時」「更新日時」のみ) (`answers/index.vue`) | 各設問を個別列として動的表示 (`forms/answers/index.blade.php`) |
| SF9 | 🔴 | 回答一覧 企画情報の詳細 | 企画名のみ (`answers/index.vue`) | 企画名(よみ)、団体名(よみ)、企画ID (`forms/answers/index.blade.php`) |
| SF10 | 🟡 | 回答アップロード一覧 BETAバッジ | **欠落** (`answers/uploads.vue`) | `<app-badge muted small>BETA</app-badge>` (`answers/uploads/index.blade.php`) |
| SF11 | 🟡 | 設問削除API | あり (`staff_forms.go:604`) | UpdateFormActionで一括更新 (個別削除非明示) |
| SF12 | 🟡 | 設問並び替えAPI | あり (`staff_forms.go:635`) | FormEditorService内で処理 (専用エンドポイントなし) |

---

### Staff Circles / ParticipationTypes

#### Go: `backend/internal/controllers/staff_circles*.go` + `staff_participation_types.go` ↔ Laravel: `app/Http/Controllers/Staff/Circles/*`

| # | 優先度 | 差異 | Go | Laravel |
|---|--------|------|-----|---------|
| SC1 | ✅ | サーバーサイド検索・絞り込み | 実装済 | 同一 |
| SC2 | 🔴 | スタッフ作成時の `submitted_at` 自動設定 | **未設定** (`staff_circles.go:311-323`) | `StoreAction.php:64-65`: `submitted_at = now()` |
| SC3 | 🟡 | `status_set_at/by` の pending時 null リセット | 常にstatusSetByを設定 (`staff_circles.go:384`) | pending時はnullにリセット (`UpdateAction.php:56-59`) |
| SC4 | 🔴 | 参加種別の一度だけ設定制限 | 常に更新可能 (`staff_circles.go:378`) | 未設定時のみ設定可 (`UpdateAction.php:71-74`) |
| SC5 | 🟡 | メールCC先 | `contactEmail` にCC (`staff_circles.go:724`) | `Auth::user()` にCC (`SendAction.php:47`) |
| SC6 | 🔴 | `name_yomi`/`group_name_yomi` の正規表現バリデーション | **欠落** (`staff_circles_helpers.go:56,62`) | `BaseCircleRequest.php` に存在 |
| SC7 | 🔴 | `leader` の学籍番号DB存在チェック | **欠落** (メンバー追加は独立エンドポイント) | `BaseCircleRequest.php:41`: `exists:users,student_id` |
| SC8 | 🔴 | メンバー未登録/未認証カスタムバリデーション | **欠落** | `BaseCircleRequest.php:93-100` |
| SC9 | 🔴 | `leader` がメンバーリストから除外 | **欠落** | `UpdateAction.php:46-48` |
| SC10 | 🔴 | スタッフ控えBCC | **欠落** | `SendAction.php:44` |
| SC11 | 🟡 | 参加種別作成時 デフォルト確認メッセージ | 任意入力 (`staff_participation_types.go:212`) | 固定テンプレート文 (`StoreAction.php:18-21`) |
| SC12 | 🔴 | ParticipationTypesのmutation APIがVue側に未実装 | **欠落** (読み取りのみ) | BladeでCRUDフォーム完備 |
| SC13 | 🟡 | CSVカラム 13カラム | `staff_circles.go:241` | CirclesExport.php (別ファイル、カラム数異なる可能性) |

#### Vue ↔ Blade UI差異 (Staff Circles/ParticipationTypes)

| # | 優先度 | 差異 | Vue | Blade |
|---|--------|------|-----|-------|
| SC14 | 🔴 | 企画フォーム 責任者・副責任者の学籍番号入力 | コンポーネント依存 (`StaffCircleCreateCard.vue`) | テキストエリアで入力可能 (`staff/circles/form.blade.php`) |
| SC15 | 🟡 | 企画フォーム 参加登録受理設定 (radio) | コンポーネント依存 | pending/approved/rejected radio + 不受理理由Markdownエディタ |
| SC16 | 🟡 | 企画フォーム カスタムフォーム回答リンク | コンポーネント依存 | `staff.forms.answers.create` へのリンク表示 |
| SC17 | 🟡 | 企画フォーム タグ入力 | コンポーネント依存 | tags-input コンポーネント |
| SC18 | 🟡 | 企画一覧(全件) メール送信アクション | コンポーネント依存 (`StaffCirclesAllPage.vue`) | `far fa-envelope` アイコンアクション (`data_grid.blade.php`) |
| SC19 | 🟡 | 企画一覧 参加種別ごとのタブストリップ | コンポーネント依存 | `includes.staff_circles_tab_strip` include |

---

### Staff Users / Permissions

#### Go: `backend/internal/controllers/staff_users*.go` + `staff_permissions.go` ↔ Laravel: `app/Http/Controllers/Staff/Users/*` + `Permissions/*`

| # | 優先度 | 差異 | Go | Laravel |
|---|--------|------|-----|---------|
| SU1 | 🟡 | 認可モデル | capabilityベース集中管理 (`staff_access.go:37`) | `is_admin/is_staff` bool |
| SU2 | 🟡 | ユーザーデータモデル | `firstName/lastName/displayName` 分割 | `name` (スペース区切り) |
| SU3 | 🟢 | 自己削除禁止・admin削除制限 | 実装済 | なし |
| SU4 | 🟢 | 他ユーザー情報変更時セッション破棄 | 実装済 (`staff_users_helpers.go:131`) | なし |
| SU5 | 🟡 | 認証コード平文保存 | `ConstantTimeCompare` で対策 (`staff_verify.go:67`) | `StaffAuthService` 経由 |
| SU6 | 🔴 | `notes` フィールド | **欠落** | Userモデルに存在 |
| SU7 | 🔴 | 氏名正規表現バリデーション | **欠落** | `UserRequest.php` に存在 |
| SU8 | 🔴 | 学籍番号/メール一意性バリデーション | `useradmin.ErrConflict` で `loginIds` エラー (`staff_users.go:129-133`) | `UserRequest.php:31-38` |
| SU9 | 🔴 | 学内メール形式バリデーション | **欠落** (deriveStaffUserUnivemail のみ) | `UserRequest.php:80-89`: `isValidUnivemailByLocalPartAndDomainPart` |
| SU10 | 🔴 | `is_verified_by_staff` フラグ | **欠落** | Userモデルに存在 |
| SU11 | 🟡 | 権限定義の取得方法 | `staffpermission.Defined()` コード内定義 (`staff_permissions.go:92`) | `Permission` EloquentモデルからDB取得 |
| SU12 | 🟢 | 不明権限のフォールバック表示 | `mapStaffPermissionUserSummary` で「不明な権限」 (`staff_permissions.go:234-241`) | なし |

#### Vue ↔ Blade UI差異 (Staff Users)

| # | 優先度 | 差異 | Vue | Blade |
|---|--------|------|-----|-------|
| SU13 | 🔴 | 本人確認済マークボタン | コンポーネント依存 (`StaffUsersIndexContent.vue`) | 未確認ユーザーに「本人確認済としてマーク」ボタン (`users/index.blade.php`) |
| SU14 | 🟡 | メール認証・本人確認の色分け表示 | コンポーネント依存 | 認証済み/未認証を色付きテキストで表示 |

---

### Staff Masters (Tags / Places / ContactCategories)

#### Go: `backend/internal/controllers/staff_masters.go` ↔ Laravel: `app/Http/Controllers/Staff/Tags/*` + `Places/*` + `Contacts/Categories/*`

| # | 優先度 | 差異 | Go | Laravel |
|---|--------|------|-----|---------|
| SM1 | ✅ | サーバーサイド検索・絞り込み | 実装済 | 同一 |
| SM2 | ✅ | Tags/Placesのnameユニーク制約 | ソフトチェック実装済 | 同一 |
| SM3 | ✅ | ContactCategoriesのemail検証 | `net/mail.ParseAddress` 実装済 | 同一 |
| SM4 | 🟡 | Tags CSV カラム減少 | 7カラム (`staff_masters.go:102`) | 9カラム (`created_at`/`updated_at` 欠落) |
| SM5 | 🟡 | ContactCategories更新時メール常時送信 | 常時送信 (`staff_masters.go:375`) | メール変更時のみ送信 |
| SM6 | 🟡 | Export権限 | read権限と兼用 | 独立export権限 |
| SM7 | 🟢 | 全操作ActivityLog記録 | 実装済 | なし |
| SM8 | 🟡 | メール送信方式 | Cloudflare Email非同期 | 同期的 |
| SM9 | 🟡 | Tags CSVエクスポートURL builder | **Vue側に欠落** (`masters/tags.ts`) | Bladeリンクあり |

#### Vue ↔ Blade UI差異 (Staff Masters)

| # | 優先度 | 差異 | Vue | Blade |
|---|--------|------|-----|-------|
| SM10 | 🟡 | お問い合わせカテゴリ削除確認ページ | **欠落** (インライン削除) | 専用削除確認画面 (`contacts/categories/delete.blade.php`) |
| SM11 | 🟡 | タグ削除確認ページ | **欠落** (インライン削除) | 専用削除確認画面 (`tags/delete.blade.php`) |

---

### Staff Admin (ActivityLogs / Mails / Exports / Portal)

#### Go: `backend/internal/controllers/staff_activity_logs.go` + `staff_mails.go` + `staff_exports.go` + `staff_portal_settings.go`

| # | 優先度 | 差異 | Go | Laravel |
|---|--------|------|-----|---------|
| SA1 | ✅ | ActivityLogs サーバーサイド検索 | 実装済 | 同一 |
| SA2 | ✅ | ActivityLogs 永続化 | SQLCリポジトリ実装済 | Spatie/activitylog |
| SA3 | 🔴 | ActivityLogs フィルタリング・ソート・Actor名列挙 | **欠落** | `ActivityLogService` に存在 |
| SA4 | 🟡 | ActivityLogs 認可 | capabilityベース（緩和） | admin限定 |
| SA5 | 🔴 | Mails 削除機能 | **欠落** | `DestroyAction` 相当あり |
| SA6 | 🟡 | Mails サービス稼働監視 (`isServiceOperational`) | **欠落** | `SendEmailService` に存在 |
| SA7 | 🟡 | Vue メール送信フォームUI | **未完成** | Bladeフォーム完備 |
| SA8 | 🟡 | Exports リソース別個別CSV | **欠落** (統合CSV+ZIPのみ) | 9種の個別CSVエクスポート |
| SA9 | 🟢 | Exports UTF-8 BOM、外部ID書き換え、ZIPバンドル | Go新機能 | なし |
| SA10 | 🔴 | PortalSettings `portalDescription`, `appForceHttps` バリデーション | **欠落** | `PortalRequest` に存在 |
| SA11 | 🟡 | `univemailLocalPart` 厳格化 | `student_id` のみ (`user_id` 非許容) | `student_id` / `user_id` 両対応 |

#### Vue ↔ Blade UI差異 (Staff Admin)

| # | 優先度 | 差異 | Vue | Blade |
|---|--------|------|-----|-------|
| SA12 | 🔴 | Aboutページ 動的バージョン表示 | **ハードコード「バージョン 5.0.0」** (`about.vue`) | `$current_version_info` から動的取得 (`about.blade.php`) |
| SA13 | 🔴 | Aboutページ ロゴ画像 | **欠落** (テキストのみ) (`about.vue`) | dark/lightテーマ対応ロゴ表示 (`about.blade.php`) |
| SA14 | 🔴 | Aboutページ アップデートダウンロードリンク | **サンプルデータのみ** (`about.vue`) | 実際のダウンロードリンク+ファイルサイズ (`about.blade.php`) |
| SA15 | 🔴 | Aboutページ 動的リリースノート | **ハードコード** (`about.vue`) | `$latest_release->getBody()` のMarkdown表示 (`about.blade.php`) |
| SA16 | 🔴 | Aboutページ 管理者/非管理者の条件分岐 | 全員同じ静的表示 (`about.vue`) | 管理者:アップデート手順詳細、非管理者:管理者依頼メッセージ |
| SA17 | 🟡 | Aboutページ Gitリポジトリ版注記 | **欠落** (`about.vue`) | Git版の場合に注記表示 (`about.blade.php`) |
| SA18 | 🟡 | ActivityLogs BETAバッジ | **欠落** (`activity-logs.vue`) | `<app-badge muted small>BETA</app-badge>` (`activity_log/index.blade.php`) |
| SA19 | 🟡 | ActivityLogs ログ対象外項目列挙 | 簡略化 (`activity-logs.vue`) | 記録していない情報の詳細リスト (`activity_log/index.blade.php`) |
| SA20 | 🔴 | Mails CRON設定手順 | **欠落** (「Cloudflare Workers」に差し替え) (`mails.vue`) | `php artisan schedule:run` 5分間隔手順 (`send_emails/index.blade.php`) |
| SA21 | 🔴 | Mails 全配信キャンセル機能 | **欠落** (`mails.vue`) | キャンセルセクション+ボタン表示 (`send_emails/index.blade.php`) |
| SA22 | 🔴 | Mails メール配信失敗アラート | **欠落** (`mails.vue`) | `$hasSentEmail` に基づくアラート表示 (`send_emails/index.blade.php`) |

---

### 共通UI差異 (複数ページ横断)

| # | 優先度 | 差異 | Vue | Blade |
|---|--------|------|-----|-------|
| UI1 | 🔴 | ホーム メール認証アラート | **欠落** (`index.vue`) | 未認証ユーザーに `top-alert` で認証促進 (`home.blade.php`) |
| UI2 | 🔴 | スタッフホーム メール配信失敗アラート | **欠落** (`staff/index.vue`) | `$hasSentEmail` が false 時にCRON設定アラート (`staff/home.blade.php`) |
| UI3 | 🟡 | スタッフホーム 権限無しユーザー向け詳細ガイダンス | 簡素な1行 (`staff/index.vue`) | アクセス権付与依頼・各機能説明の詳細メッセージ (`staff/home.blade.php`) |
| UI4 | 🟡 | ログイン `student_id_name` の動的config反映 | ハードコード「学籍番号」 (`login.vue`) | `config('portal.student_id_name')` 使用 (`auth/login.blade.php`) |
| UI5 | 🟡 | ログイン autofocus | **欠落** (`login.vue`) | ログインIDフィールドに autofocus (`auth/login.blade.php`) |
| UI6 | 🔴 | ユーザー設定 企画所属時 readonly + 説明 | 実装依存 (`workspace/settings/index.vue`) | readonly + 「企画に所属しているため修正できません」 (`users/edit.blade.php`) |
| UI7 | 🟢 | アカウント削除 管理者名 config | 「運営までお問い合わせください」 (`settings/delete.vue`) | `config('portal.admin_name')` 使用 (`users/delete.blade.php`) |
| UI8 | 🟡 | お問い合わせ 「その他」カテゴリ選択肢 | **欠落** (`workspace/contact.vue`) | `<option value="0">その他</option>` (`contacts/form.blade.php`) |
| UI9 | 🟡 | お問い合わせ カテゴリ未設定時 hidden input | **欠落** (`workspace/contact.vue`) | `<input type="hidden" name="category" value="0">` (`contacts/form.blade.php`) |
| UI10 | 🟡 | お問い合わせ 企画未所属時 名前+学籍番号表示 | 企画名のみ (`workspace/contact.vue`) | `Auth::user()->name(student_id)` 形式 (`contacts/form.blade.php`) |
| UI11 | 🟡 | お問い合わせ 複数企画所属時の企画変更リンク | **欠落** (`workspace/contact.vue`) | `route('circles.selector.show')` への「変更」リンク (`contacts/form.blade.php`) |
| UI12 | 🟡 | お問い合わせ 返信先メールのフォールバック | `contactEmail || '未設定のメールアドレス'` | `Auth::user()->email` |
| UI13 | 🟡 | デバッグモード用ボタン (全フォーム横断) | **全て欠落** | `config('app.debug')` 時に「バリデーションせずに送信」ボタン |
| UI14 | 🟡 | パスワード変更 autocomplete用隠しユーザー名 | コンポーネント依存 (`settings/password.vue`) | `input hidden` でユーザー名仕込み (`users/change_password.blade.php`) |
| UI15 | 🟢 | メール認証通知ページ (`/email/verify`) | **欠落** | 認証メール確認促進+再送ボタン (`auth/verify.blade.php`) |
| UI16 | 🟢 | メール認証完了ページ (`/email/verify/completed`) | **欠落** | 両メール認証完了通知 (`auth/verify_completed.blade.php`) |
| UI17 | 🟢 | ログアウト確認ページ (`/logout`) | **欠落** | ログアウト確認画面 (`auth/logout.blade.php`) |

---

## セッション/ミドルウェア 差異

| # | 優先度 | 差異 | Go | Laravel |
|---|--------|------|-----|---------|
| MW1 | 🟡 | `CheckSelectedCircle` | `session_bootstrap` 内で解決 (`session_bootstrap.go:114-155`) | リクエスト毎ミドルウェア (`CheckSelectedCircle.php:30-56`) |
| MW2 | 🟡 | `EnsureEmailIsVerified` | フロントエンド側で対応 | ミドルウェア |
| MW3 | 🔴 | `UpdateLastAccessedAt` | **欠落** | ミドルウェア |
| MW4 | 🟡 | `TrimStrings` | 各ハンドラで `strings.TrimSpace` 個別適用 (部分的) | ミドルウェア |
| MW5 | 🟢 | 外部IDエンコード/デコード | Go新機能 (`external_ids.go`) | なし |
| MW6 | 🟢 | 構造化アクセスログ | Go新機能 | なし |
| MW7 | 🟢 | IPレート制限 | Go新機能 | なし |
| MW8 | 🟢 | セッション他端末破棄 | Go新機能 | なし |

---

## デッドコード警告

以下のディレクトリはすべて `//go:build ignore` でコンパイル除外:
- `backend/internal/http/public/`
- `backend/internal/http/workspace/`
- `backend/internal/http/staff/`
- `backend/internal/http/shared/`

実際に使われているのは `backend/internal/controllers/` 側。両者で一部ロジック差異あり。

---

## Vue API ↔ Go ルート不一致

### Vueが呼んでいるがGoに存在しないエンドポイント

| # | Vue関数 | HTTP Method + Path | 状況 |
|---|---------|--------------------|------|
| API1 | `fetchCircleByInvitationToken` | `GET /circles/join/{token}` | Goの `WorkspaceRoutes.GetCircleByInvitationToken` はstructで宣言されているが `RegisterWorkspaceRoutes` で配線されていない |

### Goに登録されているがVueから呼ばれていないエンドポイント

| # | Go Route | HTTP Method | Go Handler | 備考 |
|---|----------|-------------|------------|------|
| API2 | `/public/documents/:documentID` | GET | `GetPublicDocument` | Vueに呼び出し無し |
| API3 | `/staff/tags/export` | GET | `DownloadStaffTagsCSV` | Vueの tags.ts に export URL builder が無い |
| API4 | `/staff/forms/:formID/edit` | GET | `GetStaffForm` (alias) | Vueは `/:formID` のみ使用 |
| API5 | `/staff/forms/:formID/answers/not_answered` | GET | `ListStaffFormNotAnsweredCircles` | Vueに呼び出し無し |
| API6 | `/staff/forms/:formID/not_answered` | GET | `ListStaffFormNotAnsweredCircles` (alias) | 同上 |
| API7 | `/staff/forms/:formID/answers/uploads/download_zip` | POST | `DownloadStaffFormAnswerUploadsZIP` | VueはGET版のみ使用 |
| API8 | `/staff/exports/summary.csv` | GET | `DownloadStaffSummaryCSV` | Vueに呼び出し無し |
| API9 | `/staff/exports/bundle.zip` | GET | `DownloadStaffBundleZIP` | Vueに呼び出し無し |
| API10 | `/circles/current/auth` | POST | `AuthCurrentCircle` | Vueのcircles/api.tsにGrant/claim circle auth用API関数なし |
| API11 | `/documents/:documentID` | GET | `GetDocument` (workspace) | Vueのdocuments apiはpaginated listのみ |

---

## 優先度別 全未解決差異一覧

### 🔴 高優先度（要修正）

1. `GET /circles/join/{token}` ルート配線漏れ — `circles.go` / `routes.go`
2. 提出済み企画の招待トークンチェック — `circles_handlers.go:653-678`
3. `name_yomi` / `group_name_yomi` 正規表現バリデーション — `circles_handlers.go:176-181,209-212` + `staff_circles_helpers.go:56,62`
4. 参加種別フォームのカスタムバリデーション — `circles_handlers.go:222-225`
5. 提出時のタグ同期 (`syncWithoutDetaching`) — `circles_handlers.go:499`
6. スタッフ作成時の `submitted_at` 自動設定 — `staff_circles.go:311-323`
7. 参加種別の一度だけ設定制限 — `staff_circles.go:378`
8. `leader` の学籍番号DB存在チェック — `staff_circles.go`
9. メンバー未登録/未認証カスタムバリデーション — `staff_circles.go`
10. `leader` がメンバーリストから除外 — `staff_circles.go`
11. スタッフ控えBCC — `staff_circles.go:724`
12. `univemail_domain_part` の設定値検証 — `auth_registration.go:89-91`
13. `univemail_local_part` の `same:student_id` クロスフィールド検証 — `auth_registration.go`
14. 登録メール送信対象（両方→連絡先のみ） — `auth_registration.go:289-298`
15. 認証URL有効期限（5分→60分） — `auth_registration.go:18`
16. ログアウト時スタッフ認証解除 — `auth.go:89-107`
17. ログアウト時企画セレクターリセット — `auth.go:89-107`
18. ログイン試行スロットリング — `auth.go`
19. CSRF保護 — `auth.go`
20. デモモード — `staff_forms.go`
21. 参加登録フォームの固定設問 — `staff_forms.go`
22. フォーム作成者への `【スタッフ用控え】` 通知 — `form_answer_notifications.go`
23. `notes` フィールド — `staff_users.go`
24. 氏名正規表現バリデーション — `staff_users.go`
25. 学内メール形式バリデーション — `staff_users.go`
26. `is_verified_by_staff` フラグ — `staff_users.go`
27. ParticipationTypesのmutation API (Vue側) — `participation-types/api.ts`
28. `PortalSettings` `portalDescription`/`appForceHttps` バリデーション — `staff_portal_settings.go`
29. ActivityLogs フィルタリング・ソート・Actor名列挙 — `staff_activity_logs.go`
30. Mails 削除機能 — `staff_mails.go`
31. Mails 全配信キャンセル機能 (Vue側) — `mails.vue`
32. Mails サービス稼働監視 (`isServiceOperational`) — `staff_mails.go`
33. `UpdateLastAccessedAt` — 全コントローラ

#### Vue UI 高優先度

34. 企画詳細「この企画から抜ける」ボタン — `workspace/circles/detail.vue`
35. 不受理理由のMarkdown表示 — `workspace/circles/detail.vue`
36. セレクター未提出企画の警告セクション — `circles/select.vue`
37. 回答一覧グリッドの設問列 — `staff/forms/[formId]/answers/index.vue`
38. 回答一覧 企画情報の詳細 — `staff/forms/[formId]/answers/index.vue`
39. 本人確認済マークボタン — `staff/users/index.vue`
40. スタッフホーム メール配信失敗アラート — `staff/index.vue`
41. ホーム メール認証アラート — `index.vue`
42. Aboutページ 動的バージョン表示 — `staff/about.vue`
43. Aboutページ ロゴ画像 — `staff/about.vue`
44. Aboutページ アップデートダウンロードリンク — `staff/about.vue`
45. Aboutページ 動的リリースノート — `staff/about.vue`
46. Aboutページ 管理者/非管理者の条件分岐 — `staff/about.vue`
47. Mails CRON設定手順 (Vue側でCloudflare Workers向けに差し替え要) — `staff/mails.vue`
48. Mails 全配信キャンセル機能 (Vue側) — `staff/mails.vue`
49. Mails メール配信失敗アラート — `staff/mails.vue`
50. ユーザー設定 企画所属時 readonly + 説明 — `workspace/settings/index.vue`

### 🟡 中優先度（挙動差あり）

51. 削除確認ページ (`circles.delete`) — `circles/new.vue`
52. Doneページセッションガード — `workspace/circles/done.vue`
53. `name`/`name_yomi`/`group_name`/`group_name_yomi` 最大255文字制限 — `circles_handlers.go`
54. `last_updated_timestamp` 整数型検証 — `circles_handlers.go:458`
55. メール送信形式（HTML→平文） — `circles_handlers.go:513-533`
56. 責任者削除防止の明示的エラーメッセージ — `circles_handlers.go:604-624`
57. 非リーダーの他メンバー削除制限 — `circles_handlers.go:618`
58. `can_change_group_name` 基準のリダイレクト分岐 — `circles_handlers.go:150`
59. `status_set_at/by` の pending時 null リセット — `staff_circles.go:384`
60. パスワードリセット 新サーバー未配線 — `routes.go`
61. `POST /auth/verification/verify` 新Goルート不在 — `routes.go`
62. `signed_up_at` — `auth_registration.go`
63. 登録完了判定（univemailのみ vs 両メール） — `auth_registration_helpers.go:82`
64. 認証再送方式（個別 vs 両方同時） — `auth_registration.go:320-370`
65. Pin時 `updated_at` 更新 — `staff_pages.go`
66. ページ削除時 viewableTags detach — `staff_pages.go`
67. メール送信 Markdown→プレーンテキスト簡略化 — `staff_pages.go`
68. 既存メンバーの招待ページリダイレクト分岐 — `circles_handlers.go:653-678`
69. メールCC先 — `staff_circles.go:724`
70. 参加種別作成時 デフォルト確認メッセージ — `staff_participation_types.go:212`
71. Tags CSV カラム減少 — `staff_masters.go:102`
72. ContactCategories更新時メール常時送信 — `staff_masters.go:375`
73. Export権限 独立→兼用 — `staff_exports.go`
74. Exports リソース別個別CSV — `staff_exports.go`
75. 認可 ActivityLogs (admin限定→capabilityベース) — `staff_activity_logs.go`
76. `univemailLocalPart` 厳格化 (`user_id` 非許容) — `staff_portal_settings.go`
77. 招待トークン/`can_change_group_name` フィールド — `circles.go`
78. Mails サービス稼働監視 (`isServiceOperational`) — `staff_mails.go`
79. 構築後univemailの形式検証 — `auth_registration_helpers.go:180-187`

#### Vue API 中優先度

80. Vue staff/tags.ts に export URL builder 欠落
81. Vue staff/exports に summary.csv / bundle.zip 呼び出し無し
82. Vue circles/api.ts に `POST /circles/current/auth` 呼び出し無し

#### Vue UI 中優先度

83. 企画詳細 提出後確認メッセージ表示 — `workspace/circles/detail.vue`
84. 企画ID表示 (Doneページ) — `workspace/circles/done.vue`
85. メンバー一覧 学籍番号表示 — `workspace/circles/members.vue`
86. 役割バッジ文言 — 複数Vueファイル
87. 確認画面 設問のリーダー編集リンク — `workspace/circles/confirm.vue`
88. 提出時楽観的ロック不一致の詳細説明 — `workspace/circles/confirm.vue`
89. お知らせ一覧 既読/未読表示 — `workspace/pages/index.vue`
90. フォーム一覧 以前の回答一覧表示 — `workspace/forms/[formId].vue`
91. お知らせフォーム メール配信チェックボックス — `StaffPageEditorForm.vue`
92. 配布資料フォーム ファイル必須バッジ — `staff/documents/create.vue`
93. 配布資料編集時 既存ファイル表示 — `staff/documents/[documentId]/edit.vue`
94. 回答アップロード BETAバッジ — `staff/forms/[formId]/answers/uploads.vue`
95. 企画フォーム 参加登録受理設定 — `StaffCircleCreateCard.vue`
96. スタッフホーム 権限無しユーザー向け詳細ガイダンス — `staff/index.vue`
97. ログイン `student_id_name` 動的config — `login.vue`
98. ログイン autofocus — `login.vue`
99. お問い合わせ 「その他」カテゴリ — `workspace/contact.vue`
100. お問い合わせ 企画未所属時 名前+学籍番号 — `workspace/contact.vue`
101. お問い合わせ 複数企画所属時 企画変更リンク — `workspace/contact.vue`
102. お問い合わせ 返信先メールのフォールバック — `workspace/contact.vue`
103. デバッグモード用ボタン (全フォーム) — 複数Vueファイル
104. ActivityLogs BETAバッジ — `staff/activity-logs.vue`
105. ActivityLogs ログ対象外項目列挙 — `staff/activity-logs.vue`
106. Aboutページ Gitリポジトリ版注記 — `staff/about.vue`
107. タグ/お問い合わせカテゴリ削除確認ページ — `staff/tags.vue`, `staff/contact-categories.vue`

### 🟢 低優先度（改善推奨）

108. `signed_up_at` 未実装 — `auth_registration.go`
109. Tags CSV カラム減少 — `staff_masters.go:102`
110. ログアウト確認ページ — Vue全欠落
111. メール認証通知ページ — Vue全欠落
112. メール認証完了ページ — Vue全欠落
113. 登録イベント発火 (`Registered`) — `auth_registration.go`
114. アクティビティログ無効化/再有効化 — `circles_handlers.go`
115. QRコード生成方式 (サーバー vs クライアント) — `circles/members.vue`
116. 削除フロー (2段階 vs 1段階) — 複数ファイル
117. `is_verified_by_staff` フィールド — `staff_users.go`
118. 不明権限のフォールバック表示 — `staff_permissions.go:234-241`
119. Dangerousモード（認証バイパス） — `staff_verify.go:71-77`
120. パスワード変更 autocomplete用隠しユーザー名 — `workspace/settings/password.vue`
121. アカウント削除 管理者名 config — `workspace/settings/delete.vue`
122. パスワードリセット 署名付きURL vs トークン — `auth_password_reset.go`
