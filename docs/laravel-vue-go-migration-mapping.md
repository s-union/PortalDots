# Laravel -> Vue/Go 移行対応表

## 調査対象スコープ

- 旧 Laravel/PHP 実装: `routes/`, `app/`, `resources/`, `config/`, `database/`, `bootstrap/`, `public/`, `lang/`, `tests/`, `artisan`, `composer.json`, `composer.lock`, `phpunit.xml`, `phpcs.xml`
- 新実装の主な対応先: `frontend/src/`, `backend/internal/`, `backend/db/`, `backend/cmd/`, `mise.toml`, 各 `package.json`
- 判定基準: 「機能が新実装に存在するか」を優先し、1:1 移植でないものも責務が引き継がれていれば `ある` または `部分的にある` とする
- 記法: Laravel 側パスは repo-relative に統一し、原則として Laravel 側ファイルごとに 1 行で記載する

## ステータス凡例

| Status | 意味 |
|---|---|
| `ある` | 実質的な移行先があり、主要責務が Vue/Go 側で成立している |
| `部分的にある` | 機能はあるが、責務分散・UI 統合・URL 変更・設計変更・一部未実装がある |
| `ない` | 調査範囲の Vue/Go 側に対応先を確認できない |

## routes

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `routes/api.php` | `部分的にある` | `backend/internal/presentation/httpapi/routes.go`<br>`frontend/src/features/` | API は Laravel controller 群から Go HTTP API に移行。エンドポイント名や責務分割は 1:1 ではない。 |
| `routes/channels.php` | `ない` | - | broadcasting/channel 機構は確認できない。 |
| `routes/console.php` | `部分的にある` | `backend/cmd/migrate/main.go`<br>`backend/cmd/worker/main.go`<br>`mise.toml` | Artisan console route ではなく、Go command と mise task に分散。 |
| `routes/install.php` | `ない` | - | install フローは新構成で未移行。 |
| `routes/staff.php` | `部分的にある` | `backend/internal/presentation/httpapi/routes.go`<br>`frontend/src/pages/staff/` | staff/admin の主要機能は移行済み。`/admin` -> `/staff` 再編、forms editor/frame 廃止、`send_emails` の全削除は未移行。 |
| `routes/web.php` | `部分的にある` | `backend/internal/presentation/httpapi/routes.go`<br>`frontend/src/app/router/index.ts`<br>`frontend/src/pages/` | public/workspace/staff 画面の大半は Vue へ移行。register/reset/email verify は画面中心で、一部 backend 実装が未移行。 |
## app/Http/Controllers

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Http/Controllers/Controller.php` | `ない` | - | Laravel base controller。新構成に 1:1 の土台クラスはない。 |
| `app/Http/Controllers/HomeAction.php` | `ある` | `frontend/src/pages/index.vue` | ホーム画面は Vue 化済み。 |
| `app/Http/Controllers/Staff/AboutAction.php` | `ある` | `frontend/src/pages/staff/about.vue` | about page。 |
| `app/Http/Controllers/Staff/HomeAction.php` | `ある` | `frontend/src/pages/staff/index.vue` | staff top。 |
| `app/Http/Controllers/Staff/Verify/IndexAction.php` | `ある` | `frontend/src/pages/staff/verify.vue`<br>`frontend/src/features/staff/status/api.ts`<br>`backend/internal/presentation/httpapi/staff_verify.go` | staff verify 画面。 |
| `app/Http/Controllers/Staff/Verify/VerifyAction.php` | `ある` | `frontend/src/features/staff/status/api.ts`<br>`backend/internal/presentation/httpapi/staff_verify.go` | staff verify 実行 API。認証コード配送は現状 mock。 |
| `app/Http/Controllers/Staff/Pages/ApiAction.php` | `ある` | `frontend/src/features/staff/pages/api.ts`<br>`backend/internal/presentation/httpapi/staff_pages.go` | pages API。 |
| `app/Http/Controllers/Staff/Pages/CreateAction.php` | `部分的にある` | `frontend/src/pages/staff/pages/index.vue` | 専用 create page ではなく一覧内作成に再編。 |
| `app/Http/Controllers/Staff/Pages/DestroyAction.php` | `ある` | `frontend/src/features/staff/pages/api.ts`<br>`backend/internal/presentation/httpapi/staff_pages.go` | 削除 API。 |
| `app/Http/Controllers/Staff/Pages/EditAction.php` | `ある` | `frontend/src/pages/staff/pages/[pageId].vue`<br>`frontend/src/features/staff/pages/api.ts` | 編集画面。 |
| `app/Http/Controllers/Staff/Pages/ExportAction.php` | `ある` | `frontend/src/pages/staff/pages/index.vue`<br>`frontend/src/features/staff/pages/api.ts`<br>`backend/internal/presentation/httpapi/staff_pages.go` | CSV export。 |
| `app/Http/Controllers/Staff/Pages/IndexAction.php` | `ある` | `frontend/src/pages/staff/pages/index.vue`<br>`frontend/src/pages/staff/pages/[pageId].vue`<br>`frontend/src/features/staff/pages/api.ts`<br>`backend/internal/presentation/httpapi/staff_pages.go` | 一覧画面。 |
| `app/Http/Controllers/Staff/Pages/PatchPinAction.php` | `ある` | `frontend/src/pages/staff/pages/[pageId].vue`<br>`frontend/src/features/staff/pages/api.ts` | pin/unpin 更新。 |
| `app/Http/Controllers/Staff/Pages/StoreAction.php` | `ある` | `frontend/src/features/staff/pages/api.ts`<br>`backend/internal/presentation/httpapi/staff_pages.go` | 作成 API。 |
| `app/Http/Controllers/Staff/Pages/UpdateAction.php` | `ある` | `frontend/src/features/staff/pages/api.ts`<br>`backend/internal/presentation/httpapi/staff_pages.go` | 更新 API。 |
| `app/Http/Controllers/Staff/Forms/ApiAction.php` | `ある` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | forms API。 |
| `app/Http/Controllers/Staff/Forms/CopyAction.php` | `ある` | `frontend/src/pages/staff/forms/index.vue`<br>`frontend/src/pages/staff/forms/[formId]/index.vue`<br>`backend/internal/presentation/httpapi/staff_forms.go` | copy は button 操作に再編。 |
| `app/Http/Controllers/Staff/Forms/CreateAction.php` | `部分的にある` | `frontend/src/pages/staff/forms/index.vue` | 専用 create page ではなく一覧内作成に再編。 |
| `app/Http/Controllers/Staff/Forms/DestroyAction.php` | `ある` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | 削除 API。 |
| `app/Http/Controllers/Staff/Forms/EditAction.php` | `ある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | 詳細/編集画面。 |
| `app/Http/Controllers/Staff/Forms/ExportAction.php` | `ある` | `frontend/src/pages/staff/forms/index.vue`<br>`backend/internal/presentation/httpapi/staff_forms.go` | CSV export。 |
| `app/Http/Controllers/Staff/Forms/IndexAction.php` | `ある` | `frontend/src/pages/staff/forms/index.vue`<br>`frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | 一覧画面。 |
| `app/Http/Controllers/Staff/Forms/PreviewAction.php` | `ある` | `frontend/src/pages/staff/forms/[formId]/preview.vue`<br>`frontend/src/features/staff/forms/api.ts` | preview。 |
| `app/Http/Controllers/Staff/Forms/StoreAction.php` | `ある` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | 作成 API。 |
| `app/Http/Controllers/Staff/Forms/UpdateAction.php` | `ある` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | 更新 API。 |
| `app/Http/Controllers/Staff/Forms/Editor/APIAction.php` | `部分的にある` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | Laravel 旧 API の責務は複数 API に分割。 |
| `app/Http/Controllers/Staff/Forms/Editor/AddQuestionAction.php` | `ある` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | question 追加。 |
| `app/Http/Controllers/Staff/Forms/Editor/DeleteQuestionAction.php` | `ある` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | question 削除。 |
| `app/Http/Controllers/Staff/Forms/Editor/FrameAction.php` | `ない` | - | iframe/frame 専用実装は廃止。 |
| `app/Http/Controllers/Staff/Forms/Editor/GetFormAction.php` | `ある` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | form detail 取得。 |
| `app/Http/Controllers/Staff/Forms/Editor/GetQuestionsAction.php` | `ある` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | questions 取得は詳細 payload に統合。 |
| `app/Http/Controllers/Staff/Forms/Editor/IndexAction.php` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue`<br>`frontend/src/features/staff/forms/api.ts` | 専用 editor route ではなく詳細画面へ統合。 |
| `app/Http/Controllers/Staff/Forms/Editor/UpdateFormAction.php` | `ある` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | form 更新。 |
| `app/Http/Controllers/Staff/Forms/Editor/UpdateQuestionAction.php` | `ある` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | question 更新。 |
| `app/Http/Controllers/Staff/Forms/Editor/UpdateQuestionsOrderAction.php` | `ある` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | question 並び替え。 |
| `app/Http/Controllers/Staff/Forms/Answers/ApiAction.php` | `ある` | `frontend/src/features/staff/forms/answers.ts`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | answers API。 |
| `app/Http/Controllers/Staff/Forms/Answers/CreateAction.php` | `ある` | `frontend/src/pages/staff/forms/[formId]/answers/create.vue` | 作成画面。 |
| `app/Http/Controllers/Staff/Forms/Answers/DestroyAction.php` | `ある` | `frontend/src/features/staff/forms/answers.ts`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | 削除 API。 |
| `app/Http/Controllers/Staff/Forms/Answers/EditAction.php` | `ある` | `frontend/src/pages/staff/forms/[formId]/answers/[answerId]/edit.vue` | 編集画面。 |
| `app/Http/Controllers/Staff/Forms/Answers/ExportAction.php` | `ある` | `frontend/src/pages/staff/forms/[formId]/answers/index.vue`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | CSV export。 |
| `app/Http/Controllers/Staff/Forms/Answers/IndexAction.php` | `ある` | `frontend/src/pages/staff/forms/[formId]/answers/index.vue`<br>`frontend/src/features/staff/forms/answers.ts`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | 回答一覧。 |
| `app/Http/Controllers/Staff/Forms/Answers/StoreAction.php` | `ある` | `frontend/src/features/staff/forms/answers.ts`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | 作成 API。 |
| `app/Http/Controllers/Staff/Forms/Answers/UpdateAction.php` | `ある` | `frontend/src/features/staff/forms/answers.ts`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | 更新 API。 |
| `app/Http/Controllers/Staff/Forms/Answers/NotAnswered/ShowAction.php` | `ある` | `frontend/src/pages/staff/forms/[formId]/not_answered.vue`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | 未回答一覧。 |
| `app/Http/Controllers/Staff/Forms/Answers/Uploads/DownloadZipAction.php` | `ある` | `frontend/src/pages/staff/forms/[formId]/answers/uploads.vue`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | ZIP download。 |
| `app/Http/Controllers/Staff/Forms/Answers/Uploads/IndexAction.php` | `ある` | `frontend/src/pages/staff/forms/[formId]/answers/uploads.vue`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | uploads landing。 |
| `app/Http/Controllers/Staff/Forms/Answers/Uploads/ShowAction.php` | `ある` | `frontend/src/features/staff/forms/answers.ts`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | 単一添付 download。 |
| `app/Http/Controllers/Staff/Users/ApiAction.php` | `ある` | `frontend/src/features/staff/users/api.ts`<br>`backend/internal/presentation/httpapi/staff_users.go` | users API。 |
| `app/Http/Controllers/Staff/Users/DestroyAction.php` | `ある` | `frontend/src/features/staff/users/api.ts`<br>`backend/internal/presentation/httpapi/staff_users.go` | 削除 API。 |
| `app/Http/Controllers/Staff/Users/EditAction.php` | `ある` | `frontend/src/pages/staff/users/[userId].vue` | 編集画面。 |
| `app/Http/Controllers/Staff/Users/ExportAction.php` | `ある` | `frontend/src/pages/staff/users/index.vue`<br>`backend/internal/presentation/httpapi/staff_users.go` | CSV export。 |
| `app/Http/Controllers/Staff/Users/IndexAction.php` | `ある` | `frontend/src/pages/staff/users/index.vue`<br>`frontend/src/features/staff/users/api.ts`<br>`backend/internal/presentation/httpapi/staff_users.go` | 一覧画面。 |
| `app/Http/Controllers/Staff/Users/UpdateAction.php` | `ある` | `frontend/src/features/staff/users/api.ts`<br>`backend/internal/presentation/httpapi/staff_users.go` | 更新 API。 |
| `app/Http/Controllers/Staff/Users/VerifiedAction.php` | `ある` | `frontend/src/pages/staff/users/[userId].vue`<br>`frontend/src/features/staff/users/api.ts`<br>`backend/internal/presentation/httpapi/staff_users.go` | 手動本人確認。 |
| `app/Http/Controllers/Staff/Permissions/ApiAction.php` | `ある` | `frontend/src/features/staff/permissions/api.ts`<br>`backend/internal/presentation/httpapi/staff_permissions.go` | permissions API。 |
| `app/Http/Controllers/Staff/Permissions/EditAction.php` | `ある` | `frontend/src/pages/staff/permissions/[userId].vue` | 詳細画面。 |
| `app/Http/Controllers/Staff/Permissions/IndexAction.php` | `ある` | `frontend/src/pages/staff/permissions/index.vue`<br>`frontend/src/features/staff/permissions/api.ts`<br>`backend/internal/presentation/httpapi/staff_permissions.go` | 一覧画面。 |
| `app/Http/Controllers/Staff/Permissions/UpdateAction.php` | `ある` | `frontend/src/features/staff/permissions/api.ts`<br>`backend/internal/presentation/httpapi/staff_permissions.go` | 更新 API。 |
| `app/Http/Controllers/Staff/Circles/AllAction.php` | `ある` | `frontend/src/features/staff/circles/api.ts`<br>`backend/internal/presentation/httpapi/staff_circles.go` | all list API。 |
| `app/Http/Controllers/Staff/Circles/ApiAction.php` | `ある` | `frontend/src/features/staff/circles/api.ts`<br>`backend/internal/presentation/httpapi/staff_circles.go` | circles API。 |
| `app/Http/Controllers/Staff/Circles/CreateAction.php` | `部分的にある` | `frontend/src/pages/staff/circles/index.vue` | 専用 create page ではなく一覧内作成に再編。 |
| `app/Http/Controllers/Staff/Circles/DestroyAction.php` | `ある` | `frontend/src/features/staff/circles/api.ts`<br>`backend/internal/presentation/httpapi/staff_circles.go` | 削除 API。 |
| `app/Http/Controllers/Staff/Circles/EditAction.php` | `ある` | `frontend/src/pages/staff/circles/[circleId].vue` | 詳細/編集画面。 |
| `app/Http/Controllers/Staff/Circles/ExportAction.php` | `ある` | `frontend/src/pages/staff/circles/index.vue`<br>`backend/internal/presentation/httpapi/staff_circles.go` | CSV export。 |
| `app/Http/Controllers/Staff/Circles/IndexAction.php` | `ある` | `frontend/src/pages/staff/circles/index.vue`<br>`frontend/src/features/staff/circles/api.ts`<br>`backend/internal/presentation/httpapi/staff_circles.go` | 一覧画面。 |
| `app/Http/Controllers/Staff/Circles/StoreAction.php` | `ある` | `frontend/src/features/staff/circles/api.ts`<br>`backend/internal/presentation/httpapi/staff_circles.go` | 作成 API。 |
| `app/Http/Controllers/Staff/Circles/UpdateAction.php` | `ある` | `frontend/src/features/staff/circles/api.ts`<br>`backend/internal/presentation/httpapi/staff_circles.go` | 更新 API。 |
| `app/Http/Controllers/Staff/Circles/SendEmails/IndexAction.php` | `部分的にある` | `frontend/src/pages/staff/circles/[circleId].vue`<br>`frontend/src/features/staff/circles/api.ts` | circle detail 内 mail section に統合。 |
| `app/Http/Controllers/Staff/Circles/SendEmails/SendAction.php` | `部分的にある` | `frontend/src/features/staff/circles/api.ts`<br>`backend/internal/presentation/httpapi/staff_circles.go` | 本体送信はあるがスタッフ用控えメールは未移行。 |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/ApiAction.php` | `ある` | `frontend/src/features/staff/participation-types/api.ts`<br>`backend/internal/presentation/httpapi/staff_participation_types.go` | participation types API。 |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/CreateAction.php` | `部分的にある` | `frontend/src/pages/staff/participation-types/index.vue` | 専用 create page ではなく一覧内作成に再編。 |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/DestroyAction.php` | `ある` | `frontend/src/features/staff/participation-types/api.ts`<br>`backend/internal/presentation/httpapi/staff_participation_types.go` | 削除 API。 |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/EditAction.php` | `ある` | `frontend/src/pages/staff/participation-types/[typeId].vue` | 詳細/編集画面。 |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/ExportAction.php` | `ある` | `frontend/src/pages/staff/participation-types/[typeId].vue`<br>`backend/internal/presentation/httpapi/staff_participation_types.go` | CSV export。 |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/IndexAction.php` | `ある` | `frontend/src/pages/staff/participation-types/[typeId].vue`<br>`frontend/src/features/staff/participation-types/api.ts` | type detail + circles list。 |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/StoreAction.php` | `ある` | `frontend/src/features/staff/participation-types/api.ts`<br>`backend/internal/presentation/httpapi/staff_participation_types.go` | 作成 API。 |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/UpdateAction.php` | `ある` | `frontend/src/features/staff/participation-types/api.ts`<br>`backend/internal/presentation/httpapi/staff_participation_types.go` | 更新 API。 |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/Form/EditAction.php` | `部分的にある` | `frontend/src/pages/staff/participation-types/[typeId].vue` | form settings は participation type 詳細に統合。 |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/Form/EditorAction.php` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | 専用 editor ではなく generic form editor に統合。 |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/Form/UpdateAction.php` | `ある` | `frontend/src/features/staff/participation-types/api.ts`<br>`backend/internal/presentation/httpapi/staff_participation_types.go` | form settings 更新。 |
| `app/Http/Controllers/Staff/Tags/ApiAction.php` | `ある` | `frontend/src/features/staff/masters/tags.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | tags API。 |
| `app/Http/Controllers/Staff/Tags/CreateAction.php` | `部分的にある` | `frontend/src/pages/staff/tags.vue` | 一覧内 inline create に再編。 |
| `app/Http/Controllers/Staff/Tags/DeleteAction.php` | `部分的にある` | `frontend/src/pages/staff/tags.vue` | confirm 専用ページは廃止。 |
| `app/Http/Controllers/Staff/Tags/DestroyAction.php` | `ある` | `frontend/src/features/staff/masters/tags.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | 削除 API。 |
| `app/Http/Controllers/Staff/Tags/EditAction.php` | `部分的にある` | `frontend/src/pages/staff/tags.vue` | 一覧内 inline edit に再編。 |
| `app/Http/Controllers/Staff/Tags/ExportAction.php` | `ある` | `frontend/src/pages/staff/tags.vue`<br>`backend/internal/presentation/httpapi/staff_masters.go` | CSV export。 |
| `app/Http/Controllers/Staff/Tags/IndexAction.php` | `ある` | `frontend/src/pages/staff/tags.vue`<br>`frontend/src/features/staff/masters/tags.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | 一覧画面。 |
| `app/Http/Controllers/Staff/Tags/StoreAction.php` | `ある` | `frontend/src/features/staff/masters/tags.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | 作成 API。 |
| `app/Http/Controllers/Staff/Tags/UpdateAction.php` | `ある` | `frontend/src/features/staff/masters/tags.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | 更新 API。 |
| `app/Http/Controllers/Staff/Places/ApiAction.php` | `ある` | `frontend/src/features/staff/masters/places.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | places API。 |
| `app/Http/Controllers/Staff/Places/CreateAction.php` | `部分的にある` | `frontend/src/pages/staff/places.vue` | 一覧内 inline create に再編。 |
| `app/Http/Controllers/Staff/Places/DestroyAction.php` | `ある` | `frontend/src/features/staff/masters/places.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | 削除 API。 |
| `app/Http/Controllers/Staff/Places/EditAction.php` | `部分的にある` | `frontend/src/pages/staff/places.vue` | 一覧内 inline edit に再編。 |
| `app/Http/Controllers/Staff/Places/ExportAction.php` | `ある` | `frontend/src/pages/staff/places.vue`<br>`backend/internal/presentation/httpapi/staff_masters.go` | CSV export。 |
| `app/Http/Controllers/Staff/Places/IndexAction.php` | `ある` | `frontend/src/pages/staff/places.vue`<br>`frontend/src/features/staff/masters/places.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | 一覧画面。 |
| `app/Http/Controllers/Staff/Places/StoreAction.php` | `ある` | `frontend/src/features/staff/masters/places.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | 作成 API。 |
| `app/Http/Controllers/Staff/Places/UpdateAction.php` | `ある` | `frontend/src/features/staff/masters/places.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | 更新 API。 |
| `app/Http/Controllers/Staff/SendEmails/DestroyAction.php` | `ない` | - | queue 全削除/cancel API は新実装にない。 |
| `app/Http/Controllers/Staff/SendEmails/IndexAction.php` | `部分的にある` | `frontend/src/pages/staff/mails.vue`<br>`frontend/src/features/staff/admin/mails.ts`<br>`backend/internal/presentation/httpapi/staff_mails.go` | generic mail queue へ置換。 |
| `app/Http/Controllers/Staff/Contacts/Categories/CreateAction.php` | `部分的にある` | `frontend/src/pages/staff/contact-categories.vue` | 一覧内 inline create に再編。 |
| `app/Http/Controllers/Staff/Contacts/Categories/DeleteAction.php` | `部分的にある` | `frontend/src/pages/staff/contact-categories.vue` | confirm 専用ページは廃止。 |
| `app/Http/Controllers/Staff/Contacts/Categories/DestroyAction.php` | `ある` | `frontend/src/features/staff/masters/contactCategories.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | 削除 API。 |
| `app/Http/Controllers/Staff/Contacts/Categories/EditAction.php` | `部分的にある` | `frontend/src/pages/staff/contact-categories.vue` | 一覧内 inline edit に再編。 |
| `app/Http/Controllers/Staff/Contacts/Categories/IndexAction.php` | `ある` | `frontend/src/pages/staff/contact-categories.vue`<br>`frontend/src/features/staff/masters/contactCategories.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | 一覧画面。 |
| `app/Http/Controllers/Staff/Contacts/Categories/StoreAction.php` | `ある` | `frontend/src/features/staff/masters/contactCategories.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | 作成 API。 |
| `app/Http/Controllers/Staff/Contacts/Categories/UpdateAction.php` | `ある` | `frontend/src/features/staff/masters/contactCategories.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | 更新 API。 |
| `app/Http/Controllers/Staff/Documents/ApiAction.php` | `ある` | `frontend/src/features/staff/documents/api.ts`<br>`backend/internal/presentation/httpapi/staff_documents.go` | documents API。 |
| `app/Http/Controllers/Staff/Documents/CreateAction.php` | `部分的にある` | `frontend/src/pages/staff/documents/index.vue` | 一覧内作成に再編。 |
| `app/Http/Controllers/Staff/Documents/DestroyAction.php` | `ある` | `frontend/src/features/staff/documents/api.ts`<br>`backend/internal/presentation/httpapi/staff_documents.go` | 削除 API。 |
| `app/Http/Controllers/Staff/Documents/EditAction.php` | `ある` | `frontend/src/pages/staff/documents/[documentId]/edit.vue` | 編集画面。 |
| `app/Http/Controllers/Staff/Documents/ExportAction.php` | `ある` | `frontend/src/pages/staff/documents/index.vue`<br>`backend/internal/presentation/httpapi/staff_documents.go` | CSV export。 |
| `app/Http/Controllers/Staff/Documents/IndexAction.php` | `ある` | `frontend/src/pages/staff/documents/index.vue`<br>`frontend/src/features/staff/documents/api.ts`<br>`backend/internal/presentation/httpapi/staff_documents.go` | 一覧画面。 |
| `app/Http/Controllers/Staff/Documents/ShowAction.php` | `ある` | `frontend/src/features/staff/documents/api.ts`<br>`backend/internal/presentation/httpapi/staff_documents.go` | ファイル download。 |
| `app/Http/Controllers/Staff/Documents/StoreAction.php` | `ある` | `frontend/src/features/staff/documents/api.ts`<br>`backend/internal/presentation/httpapi/staff_documents.go` | 作成 API。 |
| `app/Http/Controllers/Staff/Documents/UpdateAction.php` | `ある` | `frontend/src/features/staff/documents/api.ts`<br>`backend/internal/presentation/httpapi/staff_documents.go` | 更新 API。 |
| `app/Http/Controllers/Admin/ActivityLog/ApiAction.php` | `ある` | `frontend/src/features/staff/admin/activityLogs.ts`<br>`backend/internal/presentation/httpapi/staff_activity_logs.go` | activity logs API。 |
| `app/Http/Controllers/Admin/ActivityLog/IndexAction.php` | `ある` | `frontend/src/pages/staff/activity-logs.vue`<br>`frontend/src/features/staff/admin/activityLogs.ts`<br>`backend/internal/presentation/httpapi/staff_activity_logs.go` | `/staff/activity-logs` へ移設。 |
| `app/Http/Controllers/Admin/Portal/EditAction.php` | `ある` | `frontend/src/pages/staff/settings/portal.vue`<br>`frontend/src/features/staff/admin/portalSettings.ts` | `/staff/settings/portal` へ移設。 |
| `app/Http/Controllers/Admin/Portal/UpdateAction.php` | `ある` | `frontend/src/features/staff/admin/portalSettings.ts`<br>`backend/internal/presentation/httpapi/staff_portal_settings.go` | portal settings 更新 API。 |
| `app/Http/Controllers/Pages/IndexAction.php` | `ある` | `frontend/src/pages/workspace/pages/index.vue`<br>`frontend/src/features/pages/api.ts`<br>`backend/internal/presentation/httpapi/pages.go` | participant 向け page 一覧。 |
| `app/Http/Controllers/Pages/ShowAction.php` | `ある` | `frontend/src/pages/workspace/pages/[pageId].vue`<br>`frontend/src/features/pages/api.ts`<br>`backend/internal/presentation/httpapi/pages.go` | participant 向け page 詳細。 |
| `app/Http/Controllers/Circles/Auth/PostAction.php` | `ない` | - | circle auth 専用フローは確認できない。 |
| `app/Http/Controllers/Circles/Auth/ShowAction.php` | `ない` | - | circle auth 専用画面の直接対応は確認できない。 |
| `app/Http/Controllers/Circles/ConfirmAction.php` | `部分的にある` | `frontend/src/pages/workspace/circles/detail.vue`<br>`backend/internal/presentation/httpapi/circles.go` | 確認画面専用 route ではなく detail 内フローへ再編。 |
| `app/Http/Controllers/Circles/CreateAction.php` | `ある` | `frontend/src/pages/circles/new.vue`<br>`backend/internal/presentation/httpapi/circles.go` | 企画作成画面。 |
| `app/Http/Controllers/Circles/DeleteAction.php` | `部分的にある` | `frontend/src/pages/workspace/circles/detail.vue`<br>`backend/internal/presentation/httpapi/circles.go` | 削除確認専用 page は detail 内に統合。 |
| `app/Http/Controllers/Circles/DestroyAction.php` | `部分的にある` | `backend/internal/presentation/httpapi/circles.go` | 削除 API はあるが UI は detail から操作。 |
| `app/Http/Controllers/Circles/DoneAction.php` | `ない` | - | 旧完了画面専用 route の直接対応は確認できない。 |
| `app/Http/Controllers/Circles/EditAction.php` | `部分的にある` | `frontend/src/pages/workspace/circles/detail.vue`<br>`backend/internal/presentation/httpapi/circles.go` | 企画編集は workspace detail に再編。 |
| `app/Http/Controllers/Circles/Selector/SetAction.php` | `部分的にある` | `frontend/src/pages/circles/select.vue`<br>`backend/internal/presentation/httpapi/session_bootstrap.go` | selected circle 更新に再編。 |
| `app/Http/Controllers/Circles/Selector/ShowAction.php` | `部分的にある` | `frontend/src/pages/circles/select.vue`<br>`frontend/src/app/router/circleSelectorRedirect.ts`<br>`backend/internal/presentation/httpapi/session_bootstrap.go` | selector 画面は Vue 化され、Blade 構成は廃止。 |
| `app/Http/Controllers/Circles/ShowAction.php` | `部分的にある` | `frontend/src/pages/workspace/circles/detail.vue`<br>`backend/internal/presentation/httpapi/circles.go` | 企画詳細は workspace 画面へ再編。 |
| `app/Http/Controllers/Circles/StoreAction.php` | `ある` | `frontend/src/pages/circles/new.vue`<br>`backend/internal/presentation/httpapi/circles.go` | 企画作成 API。 |
| `app/Http/Controllers/Circles/SubmitAction.php` | `部分的にある` | `frontend/src/pages/workspace/circles/detail.vue`<br>`backend/internal/presentation/httpapi/circles.go` | 提出自体は移行したが route 構成は再編。 |
| `app/Http/Controllers/Circles/UpdateAction.php` | `部分的にある` | `frontend/src/pages/workspace/circles/detail.vue`<br>`backend/internal/presentation/httpapi/circles.go` | 更新 API はあるが route 構成は再編。 |
| `app/Http/Controllers/Circles/Users/DestroyAction.php` | `部分的にある` | `frontend/src/pages/workspace/circles/members.vue`<br>`backend/internal/presentation/httpapi/circles.go` | メンバー削除は workspace 側へ統合。 |
| `app/Http/Controllers/Circles/Users/IndexAction.php` | `部分的にある` | `frontend/src/pages/workspace/circles/members.vue`<br>`backend/internal/presentation/httpapi/circles.go` | UI は workspace 側の members 画面へ統合。 |
| `app/Http/Controllers/Circles/Users/InviteAction.php` | `部分的にある` | `frontend/src/pages/workspace/circles/members.vue`<br>`frontend/src/pages/circles/join/[token].vue`<br>`backend/internal/presentation/httpapi/circles.go` | 招待表示/参加は members + join 画面に再編。 |
| `app/Http/Controllers/Circles/Users/RegenerateTokenAction.php` | `部分的にある` | `frontend/src/pages/workspace/circles/members.vue`<br>`backend/internal/presentation/httpapi/circles.go` | 招待トークン再生成は members 画面へ統合。 |
| `app/Http/Controllers/Circles/Users/StoreAction.php` | `部分的にある` | `frontend/src/pages/workspace/circles/members.vue`<br>`backend/internal/presentation/httpapi/circles.go` | メンバー追加は workspace 側へ統合。 |
| `app/Http/Controllers/Contacts/CreateAction.php` | `ある` | `frontend/src/pages/workspace/contact.vue`<br>`frontend/src/features/contact/api.ts`<br>`backend/internal/presentation/httpapi/contact_profile.go` | 問い合わせ画面。 |
| `app/Http/Controllers/Contacts/PostAction.php` | `ある` | `frontend/src/features/contact/api.ts`<br>`backend/internal/presentation/httpapi/contact_profile.go` | 問い合わせ送信 API。 |
| `app/Http/Controllers/Documents/IndexAction.php` | `ある` | `frontend/src/pages/workspace/documents/index.vue`<br>`frontend/src/features/documents/api.ts`<br>`backend/internal/presentation/httpapi/documents.go` | participant 向け document 一覧。 |
| `app/Http/Controllers/Documents/ShowAction.php` | `ある` | `frontend/src/features/documents/api.ts`<br>`backend/internal/presentation/httpapi/documents.go` | participant 向け document 取得。 |
| `app/Http/Controllers/Forms/AllAction.php` | `部分的にある` | `frontend/src/pages/workspace/forms/index.vue`<br>`frontend/src/features/forms/api.ts`<br>`backend/internal/presentation/httpapi/forms.go` | 公開 form 一覧へ統合。 |
| `app/Http/Controllers/Forms/ClosedAction.php` | `部分的にある` | `frontend/src/pages/workspace/forms/index.vue`<br>`frontend/src/features/forms/api.ts`<br>`backend/internal/presentation/httpapi/forms.go` | closed 専用 route は一覧フィルタ/状態表示へ再編。 |
| `app/Http/Controllers/Forms/IndexAction.php` | `ある` | `frontend/src/pages/workspace/forms/index.vue`<br>`frontend/src/features/forms/api.ts`<br>`backend/internal/presentation/httpapi/forms.go` | 公開 form 一覧。 |
| `app/Http/Controllers/Forms/Answers/CreateAction.php` | `ある` | `frontend/src/pages/workspace/forms/[formId].vue`<br>`frontend/src/features/forms/answers.ts`<br>`backend/internal/presentation/httpapi/form_answers.go` | participant 回答作成画面。 |
| `app/Http/Controllers/Forms/Answers/EditAction.php` | `ある` | `frontend/src/pages/workspace/forms/[formId].vue`<br>`frontend/src/features/forms/answers.ts`<br>`backend/internal/presentation/httpapi/form_answers.go` | participant 回答編集画面。 |
| `app/Http/Controllers/Forms/Answers/StoreAction.php` | `ある` | `frontend/src/features/forms/answers.ts`<br>`backend/internal/presentation/httpapi/form_answers.go` | participant 回答 API。 |
| `app/Http/Controllers/Forms/Answers/UpdateAction.php` | `ある` | `frontend/src/features/forms/answers.ts`<br>`backend/internal/presentation/httpapi/form_answers.go` | participant 回答 API。 |
| `app/Http/Controllers/Forms/Answers/Uploads/ShowAction.php` | `ある` | `frontend/src/features/forms/answers.ts`<br>`backend/internal/presentation/httpapi/form_answers.go` | participant 添付 download。 |
| `app/Http/Controllers/Auth/LoginController.php` | `ある` | `frontend/src/pages/login.vue`<br>`frontend/src/features/auth/api.ts`<br>`backend/internal/presentation/httpapi/auth.go` | ログイン/ログアウトは移行。 |
| `app/Http/Controllers/Auth/RegisterController.php` | `部分的にある` | `frontend/src/pages/register.vue` | 登録画面はあるが、登録 backend は未移行。 |
| `app/Http/Controllers/Auth/Password/PostResetPasswordAction.php` | `部分的にある` | `frontend/src/pages/password/reset/[userId].vue` | reset 完了画面はあるが backend は未移行。 |
| `app/Http/Controllers/Auth/Password/PostResetStartAction.php` | `部分的にある` | `frontend/src/pages/password/reset.vue` | reset 開始画面はあるが backend は未移行。 |
| `app/Http/Controllers/Auth/Password/ResetPasswordAction.php` | `部分的にある` | `frontend/src/pages/password/reset/[userId].vue` | reset 完了画面はあるが backend は未移行。 |
| `app/Http/Controllers/Auth/Password/ResetStartAction.php` | `部分的にある` | `frontend/src/pages/password/reset.vue` | reset 開始画面はあるが backend は未移行。 |
| `app/Http/Controllers/Auth/Email/CompletedAction.php` | `部分的にある` | `frontend/src/pages/email/verify/completed.vue` | verify 完了画面はあるが backend は未移行。 |
| `app/Http/Controllers/Auth/Email/ResendAction.php` | `部分的にある` | `frontend/src/pages/email/verify/[type]/[userId].vue` | verify/resend UI はあるが backend は未移行。 |
| `app/Http/Controllers/Auth/Email/VerifyAction.php` | `部分的にある` | `frontend/src/pages/email/verify/[type]/[userId].vue` | verify/resend UI はあるが backend は未移行。 |
| `app/Http/Controllers/Auth/Email/VerifyNoticeAction.php` | `部分的にある` | `frontend/src/pages/email/verify.vue` | verify 案内画面はあるが backend は未移行。 |
| `app/Http/Controllers/Users/ChangePasswordAction.php` | `ある` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/password.ts` | パスワード変更画面。 |
| `app/Http/Controllers/Users/DeleteAction.php` | `部分的にある` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/deleteAccount.ts` | 削除確認専用 page ではなく settings 内フローに統合。 |
| `app/Http/Controllers/Users/DestroyAction.php` | `ある` | `frontend/src/features/session/deleteAccount.ts`<br>`backend/internal/presentation/httpapi/contact_profile.go` | 自己アカウント削除 API。 |
| `app/Http/Controllers/Users/EditAppearanceAction.php` | `ある` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/theme.ts` | 外観設定画面。 |
| `app/Http/Controllers/Users/EditInfoAction.php` | `ある` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/profile.ts` | プロフィール編集画面。 |
| `app/Http/Controllers/Users/PostChangePasswordAction.php` | `ある` | `frontend/src/features/session/password.ts`<br>`backend/internal/presentation/httpapi/contact_profile.go` | パスワード変更 API。 |
| `app/Http/Controllers/Users/UpdateAppearanceAction.php` | `ある` | `frontend/src/features/session/theme.ts` | 外観設定更新。 |
| `app/Http/Controllers/Users/UpdateInfoAction.php` | `ある` | `frontend/src/features/session/profile.ts`<br>`backend/internal/presentation/httpapi/contact_profile.go` | プロフィール更新 API。 |
| `app/Http/Controllers/Install/Admin/CreateAction.php` | `ない` | - | install フロー自体が未移行。 |
| `app/Http/Controllers/Install/Admin/StoreAction.php` | `ない` | - | install フロー自体が未移行。 |
| `app/Http/Controllers/Install/Database/EditAction.php` | `ない` | - | install フロー自体が未移行。 |
| `app/Http/Controllers/Install/Database/UpdateAction.php` | `ない` | - | install フロー自体が未移行。 |
| `app/Http/Controllers/Install/HomeAction.php` | `ない` | - | install フロー自体が未移行。 |
| `app/Http/Controllers/Install/Mail/EditAction.php` | `ない` | - | install フロー自体が未移行。 |
| `app/Http/Controllers/Install/Mail/SendTestAction.php` | `ない` | - | install フロー自体が未移行。 |
| `app/Http/Controllers/Install/Mail/UpdateAction.php` | `ない` | - | install フロー自体が未移行。 |
| `app/Http/Controllers/Install/Portal/EditAction.php` | `ない` | - | install フロー自体が未移行。 |
| `app/Http/Controllers/Install/Portal/UpdateAction.php` | `ない` | - | install フロー自体が未移行。 |


## app/Services

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Services/Auth/EmailService.php` | `ない` | - | email verification URL 発行/送信の新実装を確認できない。 |
| `app/Services/Auth/RegisterService.php` | `ない` | - | 新規登録 API がない。 |
| `app/Services/Auth/ResetPasswordService.php` | `ない` | - | パスワードリセット開始/完了 API がない。 |
| `app/Services/Auth/StaffAuthService.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_verify.go`<br>`frontend/src/features/staff/status/api.ts` | staff 認証フローはあるが、メール通知ではなく mock verify code。 |
| `app/Services/Auth/VerifyService.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_users.go`<br>`frontend/src/features/staff/users/api.ts` | `isVerified` 更新はあるが、email/univemail の二系統検証ではない。 |
| `app/Services/Circles/CirclesService.php` | `部分的にある` | `backend/internal/presentation/httpapi/circles.go`<br>`backend/internal/presentation/httpapi/staff_circles.go`<br>`backend/internal/domain/circle/catalog.go` | 企画 CRUD/提出/メンバー/招待は移行。承認/却下 mail は未確認。 |
| `app/Services/Circles/SelectorService.php` | `ある` | `backend/internal/presentation/httpapi/circles.go`<br>`backend/internal/presentation/httpapi/session_bootstrap.go` | current circle 選択/保持に置換。 |
| `app/Services/Contacts/ContactCategoriesService.php` | `部分的にある` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`backend/internal/presentation/httpapi/staff_masters.go` | カテゴリ参照/CRUD はあるが、カテゴリ向け test send 専用 service はない。 |
| `app/Services/Contacts/ContactsService.php` | `ある` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`backend/internal/domain/mailqueue/repository.go`<br>`frontend/src/features/contact/api.ts` | 問い合わせ登録/履歴/メール投入は移行済み。 |
| `app/Services/Documents/DocumentsService.php` | `ある` | `backend/internal/presentation/httpapi/staff_documents.go`<br>`backend/internal/domain/document/repository.go`<br>`frontend/src/features/staff/documents/api.ts` | 配布資料 CRUD/ダウンロードに置換。 |
| `app/Services/Emails/SendEmailService.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_mails.go`<br>`backend/internal/domain/mailqueue/repository.go`<br>`backend/internal/app/worker/mailer.go` | 汎用送信 service は mail queue + worker に再編。 |
| `app/Services/Forms/AnswerDetailsService.php` | `ある` | `backend/internal/presentation/httpapi/form_answers.go`<br>`backend/internal/presentation/httpapi/staff_form_answers.go`<br>`backend/internal/domain/answer/repository.go` | details/upload 処理に置換。 |
| `app/Services/Forms/AnswersService.php` | `部分的にある` | `backend/internal/presentation/httpapi/form_answers.go`<br>`backend/internal/presentation/httpapi/staff_form_answers.go`<br>`frontend/src/features/forms/answers.ts` | 回答 CRUD はある。確認メールは完全 1:1 ではない。 |
| `app/Services/Forms/DownloadZipService.php` | `ある` | `backend/internal/presentation/httpapi/staff_form_answers.go` | 添付 ZIP 出力に置換。 |
| `app/Services/Forms/Exceptions/NoDownloadFileExistException.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_form_answers.go` | 機能はあるが専用例外型はない。 |
| `app/Services/Forms/Exceptions/ZipArchiveNotSupportedException.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_form_answers.go` | ZIP 生成はあるが専用例外型はない。 |
| `app/Services/Forms/FormEditorService.php` | `ある` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`frontend/src/features/staff/forms/api.ts` | form 更新に置換。 |
| `app/Services/Forms/FormsService.php` | `ある` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`backend/internal/domain/form/repository.go`<br>`frontend/src/features/staff/forms/api.ts` | create/update/delete/copy がある。 |
| `app/Services/Forms/QuestionsService.php` | `ある` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`backend/internal/domain/formquestion/repository.go`<br>`frontend/src/features/staff/forms/api.ts` | 設問 CRUD/並び替えがある。 |
| `app/Services/Forms/ValidationRulesService.php` | `ある` | `backend/internal/presentation/httpapi/form_answers.go`<br>`backend/internal/presentation/httpapi/staff_forms.go` | 動的設問バリデーションとして再実装。 |
| `app/Services/Install/AbstractService.php` | `ない` | - | install 機構自体が対象内にない。 |
| `app/Services/Install/DatabaseService.php` | `ない` | - | install DB 接続確認未移行。 |
| `app/Services/Install/MailService.php` | `ない` | - | install mail 設定/送信テスト未移行。 |
| `app/Services/Install/PortalService.php` | `ない` | - | install portal 設定入力フロー未移行。 |
| `app/Services/Install/RunInstallService.php` | `ない` | - | `.env` 更新/Artisan 実行相当なし。 |
| `app/Services/Pages/PagesService.php` | `ある` | `backend/internal/presentation/httpapi/staff_pages.go`<br>`backend/internal/domain/page/repository.go`<br>`frontend/src/features/staff/pages/api.ts` | ページ CRUD/pin/送信メール投入あり。 |
| `app/Services/Pages/ReadsService.php` | `ない` | - | 既読数/既読マーク機能は未移行。 |
| `app/Services/ParticipationTypes/ParticipationTypesService.php` | `ある` | `backend/internal/presentation/httpapi/staff_participation_types.go`<br>`backend/internal/domain/participationtype/repository.go`<br>`frontend/src/features/staff/participation-types/api.ts` | 参加種別管理に置換。 |
| `app/Services/Tags/Exceptions/DenyCreateTagsException.php` | `ない` | - | 自動タグ生成拒否の専用例外はない。 |
| `app/Services/Tags/TagsService.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_masters.go`<br>`backend/internal/domain/tag/repository.go`<br>`frontend/src/features/staff/masters/tags.ts` | タグ CRUD はあるが `getOrCreateTags` 的補助 service はない。 |
| `app/Services/Users/ChangePasswordService.php` | `ある` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`backend/internal/domain/auth/static.go`<br>`frontend/src/features/session/password.ts` | パスワード変更に置換。 |
| `app/Services/Utils/ActivityLogService.php` | `ある` | `backend/internal/presentation/httpapi/staff_activity_logs.go`<br>`backend/internal/domain/activitylog/repository.go`<br>`frontend/src/features/staff/admin/activityLogs.ts` | activity record/list に置換。 |
| `app/Services/Utils/DotenvService.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_portal_settings.go`<br>`backend/internal/domain/portalsetting/repository.go` | portal 設定更新はあるが `.env` 編集ではない。 |
| `app/Services/Utils/FormatTextService.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_exports.go` | 出力時の整形は一部 inline 化。 |
| `app/Services/Utils/ParseMarkdownService.php` | `ない` | - | markdown 変換 service を確認できない。 |
| `app/Services/Utils/ReleaseInfoService.php` | `ない` | - | release 情報取得機能なし。 |
| `app/Services/Utils/UIThemeService.php` | `ある` | `frontend/src/features/session/theme.ts` | テーマ cookie 管理は frontend 側へ移動。 |
| `app/Services/Utils/ValueObjects/Release.php` | `ない` | - | release 表現 value object なし。 |
| `app/Services/Utils/ValueObjects/Version.php` | `ない` | - | version value object なし。 |

## app/Eloquents

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Eloquents/Answer.php` | `ある` | `backend/internal/domain/answer/repository.go` | core answer model に対応。 |
| `app/Eloquents/AnswerDetail.php` | `部分的にある` | `backend/internal/domain/answer/repository.go` | detail は独立 model ではなく `Answer.Details` に統合。 |
| `app/Eloquents/Booth.php` | `ある` | `backend/internal/domain/booth/repository.go` | place-circle 割当へ対応。 |
| `app/Eloquents/Circle.php` | `ある` | `backend/internal/domain/circle/catalog.go` | 企画 aggregate に対応。 |
| `app/Eloquents/CircleTag.php` | `部分的にある` | `backend/internal/domain/circle/catalog.go` | pivot は `Circle.Tags` に吸収。 |
| `app/Eloquents/CircleUser.php` | `部分的にある` | `backend/internal/domain/circle/catalog.go` | pivot は `CircleMember` に吸収。 |
| `app/Eloquents/Concerns/IsNewTrait.php` | `部分的にある` | `backend/internal/presentation/httpapi/documents.go` | `isNew` は inline 計算。trait はない。 |
| `app/Eloquents/ContactCategory.php` | `ある` | `backend/internal/domain/contactcategory/repository.go` | 対応あり。 |
| `app/Eloquents/Document.php` | `ある` | `backend/internal/domain/document/repository.go` | 対応あり。 |
| `app/Eloquents/Email.php` | `部分的にある` | `backend/internal/domain/mailqueue/repository.go` | mail queue job へ置換。 |
| `app/Eloquents/Form.php` | `ある` | `backend/internal/domain/form/repository.go` | 対応あり。 |
| `app/Eloquents/FormAnswerableTag.php` | `部分的にある` | `backend/internal/domain/form/repository.go` | pivot は `Form.AnswerableTags` に吸収。 |
| `app/Eloquents/Page.php` | `ある` | `backend/internal/domain/page/repository.go` | 対応あり。 |
| `app/Eloquents/PageViewableTag.php` | `部分的にある` | `backend/internal/domain/page/repository.go` | pivot は `Page.ViewableTags` に吸収。 |
| `app/Eloquents/ParticipationType.php` | `ある` | `backend/internal/domain/participationtype/repository.go` | 対応あり。 |
| `app/Eloquents/Permission.php` | `部分的にある` | `backend/internal/domain/staffpermission/definitions.go`<br>`backend/internal/presentation/httpapi/staff_permissions.go` | DB model ではなく定義集合 + user 付与権限へ置換。 |
| `app/Eloquents/Place.php` | `ある` | `backend/internal/domain/place/repository.go` | 対応あり。 |
| `app/Eloquents/Question.php` | `ある` | `backend/internal/domain/formquestion/repository.go` | 対応あり。 |
| `app/Eloquents/Read.php` | `ない` | - | 既読 pivot 未移行。 |
| `app/Eloquents/Tag.php` | `ある` | `backend/internal/domain/tag/repository.go` | 対応あり。 |
| `app/Eloquents/User.php` | `部分的にある` | `backend/internal/domain/auth/`<br>`backend/internal/domain/useradmin/`<br>`backend/internal/domain/session/` | user 表現は複数 domain に分割。email/univemail 固有属性は未対応あり。 |
| `app/Eloquents/ValueObjects/PermissionInfo.php` | `部分的にある` | `backend/internal/domain/staffpermission/definitions.go` | permission metadata 定義へ置換。 |

## app/Policies

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Policies/AnswerPolicy.php` | `部分的にある` | `backend/internal/presentation/httpapi/form_answers.go`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | 判定は handler/domain に内包。 |
| `app/Policies/Circle/BelongsPolicy.php` | `部分的にある` | `backend/internal/domain/circle/catalog.go`<br>`backend/internal/presentation/httpapi/circles.go` | 所属判定は circle catalog に内包。 |
| `app/Policies/Circle/CreatePolicy.php` | `部分的にある` | `backend/internal/presentation/httpapi/circles.go` | 企画作成可否は handler 側で判定。 |
| `app/Policies/Circle/UpdateGroupNamePolicy.php` | `部分的にある` | `backend/internal/presentation/httpapi/circles.go` | 専用 policy ではなく update handler 側に統合。 |
| `app/Policies/Circle/UpdatePolicy.php` | `部分的にある` | `backend/internal/domain/circle/catalog.go`<br>`backend/internal/presentation/httpapi/circles.go` | 更新可否は catalog/handler に統合。 |
| `app/Policies/FormPolicy.php` | `部分的にある` | `backend/internal/domain/form/repository.go`<br>`backend/internal/presentation/httpapi/forms.go` | view 判定は form/circle 条件へ統合。 |
| `app/Policies/PagePolicy.php` | `部分的にある` | `backend/internal/domain/page/repository.go`<br>`backend/internal/presentation/httpapi/pages.go` | view 判定は page repository/handler に統合。 |

## app/Http/Requests

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Http/Requests/Admin/Permissions/PermissionRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_permissions.go`<br>`frontend/src/features/staff/permissions/api.ts` | validation は handler 側へ移動。 |
| `app/Http/Requests/Auth/Password/ResetPasswordRequest.php` | `ない` | - | 対応 API なし。 |
| `app/Http/Requests/Auth/Password/ResetStartRequest.php` | `ない` | - | 対応 API なし。 |
| `app/Http/Requests/Auth/RegisterRequest.php` | `ない` | - | 対応 API なし。 |
| `app/Http/Requests/Circles/AuthRequest.php` | `ない` | - | circle auth 相当機能を確認できない。 |
| `app/Http/Requests/Circles/CircleRequest.php` | `部分的にある` | `backend/internal/presentation/httpapi/circles.go`<br>`backend/internal/presentation/httpapi/form_answers.go` | 企画作成と参加フォーム回答が分離された。 |
| `app/Http/Requests/Circles/SendEmailsRequest.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_circles.go`<br>`frontend/src/features/staff/circles/api.ts` | mail 送信先は staff 機能へ再配置。 |
| `app/Http/Requests/Circles/SubmitRequest.php` | `部分的にある` | `backend/internal/presentation/httpapi/circles.go` | 提出自体はあるが、回答系責務はフォーム API に分離。 |
| `app/Http/Requests/ContactFormRequest.php` | `ある` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`frontend/src/features/contact/api.ts` | 問い合わせ送信 validation あり。 |
| `app/Http/Requests/Forms/AnswerRequestInterface.php` | `部分的にある` | `backend/internal/presentation/httpapi/form_answers.go` | interface はなく直接 handler で扱う。 |
| `app/Http/Requests/Forms/BaseAnswerRequest.php` | `ある` | `backend/internal/presentation/httpapi/form_answers.go`<br>`frontend/src/features/forms/answers.ts` | 共通回答 validation として再実装。 |
| `app/Http/Requests/Forms/StoreAnswerRequest.php` | `ある` | `backend/internal/presentation/httpapi/form_answers.go` | 作成系に対応。 |
| `app/Http/Requests/Forms/UpdateAnswerRequest.php` | `ある` | `backend/internal/presentation/httpapi/form_answers.go` | 更新系に対応。 |
| `app/Http/Requests/Install/AdminRequest.php` | `ない` | - | install 未移行。 |
| `app/Http/Requests/Install/DatabaseRequest.php` | `ない` | - | install 未移行。 |
| `app/Http/Requests/Install/MailRequest.php` | `ない` | - | install 未移行。 |
| `app/Http/Requests/Install/PortalRequest.php` | `ない` | - | install 未移行。 |
| `app/Http/Requests/Staff/Circles/BaseCircleRequest.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_circles.go` | 新実装は `name/groupName/participationTypeId` 中心で再設計。 |
| `app/Http/Requests/Staff/Circles/CreateCircleRequest.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_circles.go` | BaseCircleRequest と同じ差分。 |
| `app/Http/Requests/Staff/Circles/ParticipationTypes/CreateParticipationTypeRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_participation_types.go`<br>`frontend/src/features/staff/participation-types/api.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Circles/ParticipationTypes/ParticipationFormRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_participation_types.go`<br>`frontend/src/features/staff/participation-types/api.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Circles/ParticipationTypes/UpdateParticipationTypeRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_participation_types.go`<br>`frontend/src/features/staff/participation-types/api.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Circles/UpdateCircleRequest.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_circles.go` | BaseCircleRequest と同じ差分。 |
| `app/Http/Requests/Staff/Contacts/Categories/CategoryRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_masters.go`<br>`frontend/src/features/staff/masters/contactCategories.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Documents/CreateDocumentRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_documents.go`<br>`frontend/src/features/staff/documents/api.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Documents/UpdateDocumentRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_documents.go`<br>`frontend/src/features/staff/documents/api.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Forms/AnswerRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_form_answers.go`<br>`frontend/src/features/staff/forms/answers.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Forms/Editor/AddQuestionRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`frontend/src/features/staff/forms/api.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Forms/Editor/DeleteQuestionRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`frontend/src/features/staff/forms/api.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Forms/Editor/UpdateFormRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`frontend/src/features/staff/forms/api.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Forms/Editor/UpdateQuestionRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`frontend/src/features/staff/forms/api.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Forms/Editor/UpdateQuestionsOrderRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`frontend/src/features/staff/forms/api.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Forms/FormRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`frontend/src/features/staff/forms/api.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Pages/PageRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_pages.go`<br>`frontend/src/features/staff/pages/api.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Pages/PatchPinRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_pages.go`<br>`frontend/src/features/staff/pages/api.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Places/PlaceRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_masters.go`<br>`frontend/src/features/staff/masters/places.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Tags/TagRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_masters.go`<br>`frontend/src/features/staff/masters/tags.ts` | 対応あり。 |
| `app/Http/Requests/Staff/Users/UserRequest.php` | `ある` | `backend/internal/presentation/httpapi/staff_users.go`<br>`frontend/src/features/staff/users/api.ts` | 対応あり。 |
| `app/Http/Requests/Users/ChangeInfoRequest.php` | `ある` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`frontend/src/features/session/profile.ts` | 対応あり。 |
| `app/Http/Requests/Users/ChangePasswordRequest.php` | `ある` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`frontend/src/features/session/password.ts` | 対応あり。 |

## app/Mail

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Mail/Auth/EmailVerificationMailable.php` | `ない` | - | email verification mail 未移行。 |
| `app/Mail/Circles/ApprovedMailable.php` | `ない` | - | 承認 workflow 自体を確認できない。 |
| `app/Mail/Circles/RejectedMailable.php` | `ない` | - | 却下 workflow 自体を確認できない。 |
| `app/Mail/Circles/SubmittedMailable.php` | `ない` | - | submit はあるが submit 通知 mail は確認できない。 |
| `app/Mail/Contacts/ContactMailable.php` | `部分的にある` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`backend/internal/domain/mailqueue/repository.go` | 問い合わせ送信は mail queue で表現。 |
| `app/Mail/Contacts/EmailCategoryMailable.php` | `部分的にある` | `backend/internal/presentation/httpapi/contact_profile.go` | 専用テンプレートではなく本文組み立て + queue。 |
| `app/Mail/Emails/SendEmailServiceMailable.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_mails.go`<br>`backend/internal/domain/mailqueue/repository.go` | 汎用 mail queue へ置換。 |
| `app/Mail/Forms/AnswerConfirmationMailable.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_form_answers.go` | mail queue 連携はあるが完全 1:1 ではない。 |
| `app/Mail/Install/TestMailMailable.php` | `ない` | - | install mail test 未移行。 |

## app/Notifications

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Notifications/Auth/Password/ResetStartNotification.php` | `ない` | - | reset start 機能なし。 |
| `app/Notifications/Auth/StaffAuthNotification.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_verify.go`<br>`frontend/src/features/staff/status/api.ts` | verify flow はあるが mail notification ではない。 |
| `app/Notifications/Users/PasswordChangedNotification.php` | `部分的にある` | `backend/internal/presentation/httpapi/contact_profile.go` | パスワード変更はあるが通知送信なし。 |

## app/Exports

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Exports/AnswersExport.php` | `ある` | `backend/internal/presentation/httpapi/staff_form_answers.go` | CSV 出力あり。 |
| `app/Exports/CirclesExport.php` | `ある` | `backend/internal/presentation/httpapi/staff_circles.go` | CSV 出力あり。 |
| `app/Exports/DocumentsExport.php` | `ある` | `backend/internal/presentation/httpapi/staff_documents.go` | CSV 出力あり。 |
| `app/Exports/FormsExport.php` | `ある` | `backend/internal/presentation/httpapi/staff_forms.go` | CSV 出力あり。 |
| `app/Exports/PagesExport.php` | `ある` | `backend/internal/presentation/httpapi/staff_pages.go` | CSV 出力あり。 |
| `app/Exports/PlacesExport.php` | `ある` | `backend/internal/presentation/httpapi/staff_masters.go` | CSV 出力あり。 |
| `app/Exports/TagsExport.php` | `ある` | `backend/internal/presentation/httpapi/staff_masters.go` | CSV 出力あり。 |
| `app/Exports/UsersExport.php` | `ある` | `backend/internal/presentation/httpapi/staff_users.go` | CSV 出力あり。 |

## app/GridMakers

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/GridMakers/ActivityLogGridMaker.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_activity_logs.go` | 一覧 + pagination はあるが汎用 grid/filter 基盤ではない。 |
| `app/GridMakers/AnswersGridMaker.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_form_answers.go` | 一覧/CSV はあるが汎用 grid ではない。 |
| `app/GridMakers/CirclesGridMaker.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_circles.go` | 一覧/CSV はあるが filter framework はない。 |
| `app/GridMakers/Concerns/UseEloquent.php` | `ない` | - | Eloquent grid 共通基盤は未移行。 |
| `app/GridMakers/DocumentsGridMaker.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_documents.go` | 一覧/CSV はあるが grid 基盤なし。 |
| `app/GridMakers/Filter/FilterQueries.php` | `ない` | - | 汎用 filter DSL 未移行。 |
| `app/GridMakers/Filter/FilterQueryItem.php` | `ない` | - | 汎用 filter DSL 未移行。 |
| `app/GridMakers/Filter/FilterableKey.php` | `ない` | - | 汎用 filter DSL 未移行。 |
| `app/GridMakers/Filter/FilterableKeyBelongsToManyOptions.php` | `ない` | - | 汎用 filter DSL 未移行。 |
| `app/GridMakers/Filter/FilterableKeyBelongsToManyWithoutChoicesOptions.php` | `ない` | - | 汎用 filter DSL 未移行。 |
| `app/GridMakers/Filter/FilterableKeyBelongsToOptions.php` | `ない` | - | 汎用 filter DSL 未移行。 |
| `app/GridMakers/Filter/FilterableKeysDict.php` | `ない` | - | 汎用 filter DSL 未移行。 |
| `app/GridMakers/FormsGridMaker.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_forms.go` | 一覧/CSV はあるが grid 基盤なし。 |
| `app/GridMakers/GridMakable.php` | `ない` | - | 汎用 grid interface 未移行。 |
| `app/GridMakers/Helpers/AnswerDetailsHelper.php` | `部分的にある` | `backend/internal/presentation/httpapi/form_answers.go`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | 回答要約/出力処理へ分散。 |
| `app/GridMakers/PagesGridMaker.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_pages.go` | 一覧/search/CSV はあるが grid 基盤なし。 |
| `app/GridMakers/PermissionsGridMaker.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_permissions.go` | 一覧 + pagination はあるが grid 基盤なし。 |
| `app/GridMakers/PlacesGridMaker.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_masters.go` | 一覧/CSV はあるが grid 基盤なし。 |
| `app/GridMakers/TagsGridMaker.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_masters.go` | 一覧/CSV はあるが grid 基盤なし。 |
| `app/GridMakers/UsersGridMaker.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_users.go` | 一覧/CSV はあるが grid 基盤なし。 |

## app/Auth

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Auth/AppUserProvider.php` | `部分的にある` | `backend/internal/domain/auth/static.go`<br>`backend/internal/domain/auth/sqlc.go`<br>`backend/internal/presentation/httpapi/auth.go` | 認証 provider は Go authenticator + login handler に置換。 |

## app/Providers

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Providers/AppServiceProvider.php` | `部分的にある` | `backend/internal/presentation/httpapi/server.go`<br>`backend/internal/presentation/httpapi/session_bootstrap.go` | Laravel provider 初期化は Go server 構成へ再編。 |
| `app/Providers/AuthServiceProvider.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_access.go`<br>`backend/internal/domain/staffpermission/definitions.go` | Gate/policy 登録は capability 判定へ置換。 |
| `app/Providers/BladeServiceProvider.php` | `ない` | - | Blade 固有。SPA 化で 1:1 なし。 |
| `app/Providers/BroadcastServiceProvider.php` | `ない` | - | broadcast 機構なし。 |
| `app/Providers/EventServiceProvider.php` | `ない` | - | Laravel event/listener ベースの対応なし。 |
| `app/Providers/RouteServiceProvider.php` | `部分的にある` | `backend/internal/presentation/httpapi/routes.go`<br>`backend/internal/presentation/httpapi/server.go` | route 登録は Go router に置換。 |

## app/Exceptions

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Exceptions/Handler.php` | `部分的にある` | `backend/internal/presentation/httpapi/errors.go` | 例外処理は HTTP API 用 error response に再編。 |

## app/Console

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Console/Kernel.php` | `部分的にある` | `backend/cmd/migrate/main.go`<br>`backend/cmd/worker/main.go`<br>`mise.toml` | scheduler/artisan kernel ではなく Go command + task runner に分散。 |

## app/Http/Middleware

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Http/Middleware/Authenticate.php` | `部分的にある` | `backend/internal/presentation/httpapi/auth.go`<br>`frontend/src/app/router/guards/auth.ts` | 認証チェックは backend session + frontend guard に分散。 |
| `app/Http/Middleware/CheckEnv.php` | `ない` | - | install/env check middleware は未移行。 |
| `app/Http/Middleware/CheckSelectedCircle.php` | `部分的にある` | `backend/internal/presentation/httpapi/session_bootstrap.go`<br>`frontend/src/app/router/circleSelectorRedirect.ts` | selected circle 制御に再編。 |
| `app/Http/Middleware/DemoMode.php` | `ない` | - | demo mode の新側実装は未確認。 |
| `app/Http/Middleware/DenyIfInstalled.php` | `ない` | - | install フロー未移行。 |
| `app/Http/Middleware/EncryptCookies.php` | `部分的にある` | `backend/internal/domain/session/sqlc.go` | session cookie はあるが Laravel cookie encryption middleware ではない。 |
| `app/Http/Middleware/EnsureEmailIsVerified.php` | `ない` | - | email verify backend が未移行。 |
| `app/Http/Middleware/ForceHttps.php` | `部分的にある` | `backend/internal/platform/config/config.go` | HTTPS 方針は config 側に寄るが middleware 1:1 はない。 |
| `app/Http/Middleware/PreventRequestsDuringMaintenance.php` | `ない` | - | maintenance middleware は未確認。 |
| `app/Http/Middleware/RedirectIfAuthenticated.php` | `部分的にある` | `frontend/src/app/router/guards/public.ts` | public route guard へ再編。 |
| `app/Http/Middleware/RedirectIfStaffNotAuthenticated.php` | `部分的にある` | `frontend/src/app/router/guards/staff.ts`<br>`backend/internal/presentation/httpapi/staff_access.go` | staff access 制御に再編。 |
| `app/Http/Middleware/TrimStrings.php` | `部分的にある` | `backend/internal/presentation/httpapi/` | 入力整形は handler 側に内包。 |
| `app/Http/Middleware/TrustHosts.php` | `ない` | - | Laravel host trust middleware は未確認。 |
| `app/Http/Middleware/TrustProxies.php` | `ない` | - | reverse proxy 設定は候補範囲内で明示ファイルなし。 |
| `app/Http/Middleware/Turbolinks.php` | `ない` | - | Turbolinks 構成は廃止。 |
| `app/Http/Middleware/UpdateLastAccessedAt.php` | `ない` | - | `last_accessed_at` 相当列は未確認。 |
| `app/Http/Middleware/ValidateSignature.php` | `部分的にある` | `backend/internal/presentation/httpapi/auth.go` | signed URL 前提の verify/reset は未移行。middleware 1:1 はない。 |
| `app/Http/Middleware/VerifyCsrfToken.php` | `部分的にある` | `backend/internal/presentation/httpapi/auth.go` | SPA + cookie session 構成に再設計。 |

## app/Http/Responders

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Http/Responders/Respondable.php` | `ない` | - | responder 抽象は不採用。 |
| `app/Http/Responders/Staff/Exceptions/GridMakerNotSetException.php` | `ない` | - | responder 専用例外は不採用。 |
| `app/Http/Responders/Staff/Exceptions/RequestNotSetException.php` | `ない` | - | responder 専用例外は不採用。 |
| `app/Http/Responders/Staff/GridResponder.php` | `ない` | - | grid responder は未移行。機能別 API 応答へ分解。 |

## app/Http/Kernel.php

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Http/Kernel.php` | `部分的にある` | `backend/internal/presentation/httpapi/server.go`<br>`backend/internal/presentation/httpapi/routes.go` | HTTP kernel 相当は Go server/router 構成へ再編。 |

## app/ReleaseInfo.php

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/ReleaseInfo.php` | `ない` | - | release 情報 model 未移行。 |

## resources/views

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `resources/views/admin/activity_log/index.blade.php` | `ある` | `frontend/src/pages/staff/activity-logs.vue` | `/staff/activity-logs` へ移設。 |
| `resources/views/admin/portal/form.blade.php` | `ある` | `frontend/src/pages/staff/settings/portal.vue` | `/staff/settings/portal` へ移設。 |
| `resources/views/auth/login.blade.php` | `ある` | `frontend/src/pages/login.vue` | login 画面。 |
| `resources/views/auth/logout.blade.php` | `部分的にある` | `frontend/src/features/auth/api.ts`<br>`frontend/src/pages/login.vue` | 専用ログアウト画面はなく session API + redirect に再編。 |
| `resources/views/auth/passwords/request.blade.php` | `部分的にある` | `frontend/src/pages/password/reset.vue` | reset start UI はあるが backend は未移行。 |
| `resources/views/auth/passwords/reset.blade.php` | `部分的にある` | `frontend/src/pages/password/reset/[userId].vue` | reset complete UI はあるが backend は未移行。 |
| `resources/views/auth/verify.blade.php` | `部分的にある` | `frontend/src/pages/email/verify.vue` | verify UI はあるが backend は未移行。 |
| `resources/views/auth/verify_completed.blade.php` | `部分的にある` | `frontend/src/pages/email/verify/completed.vue` | verify completed UI はあるが backend は未移行。 |
| `resources/views/circles/auth.blade.php` | `ない` | - | circle auth 専用画面の直接対応は確認できない。 |
| `resources/views/circles/confirm.blade.php` | `部分的にある` | `frontend/src/pages/workspace/circles/detail.vue` | confirm 専用 page ではなく detail 内フローに統合。 |
| `resources/views/circles/delete.blade.php` | `部分的にある` | `frontend/src/pages/workspace/circles/detail.vue` | delete confirm 専用 page は detail 内に統合。 |
| `resources/views/circles/done.blade.php` | `ない` | - | 旧完了画面専用 route の直接対応は確認できない。 |
| `resources/views/circles/form.blade.php` | `部分的にある` | `frontend/src/pages/circles/new.vue`<br>`frontend/src/pages/workspace/circles/detail.vue` | create/edit が新規作成画面と workspace detail に分離。 |
| `resources/views/circles/selector.blade.php` | `部分的にある` | `frontend/src/pages/circles/select.vue`<br>`frontend/src/app/router/circleSelectorRedirect.ts` | selector は Vue 画面へ移行し、Blade 構成は廃止。 |
| `resources/views/circles/show.blade.php` | `部分的にある` | `frontend/src/pages/workspace/circles/detail.vue` | 企画詳細は workspace 画面へ再編。 |
| `resources/views/circles/users/index.blade.php` | `部分的にある` | `frontend/src/pages/workspace/circles/members.vue` | メンバー一覧は workspace 側へ統合。 |
| `resources/views/circles/users/invite.blade.php` | `部分的にある` | `frontend/src/pages/workspace/circles/members.vue`<br>`frontend/src/pages/circles/join/[token].vue` | 招待表示/参加は members + join 画面へ再編。 |
| `resources/views/contacts/form.blade.php` | `ある` | `frontend/src/pages/workspace/contact.vue` | 問い合わせ画面。 |
| `resources/views/documents/index.blade.php` | `ある` | `frontend/src/pages/workspace/documents/index.vue` | participant 向け document 一覧/取得。 |
| `resources/views/emails/auth/verify.blade.php` | `ない` | - | email verify mail は未移行。 |
| `resources/views/emails/circles/approve.blade.php` | `ない` | - | 承認 mail は未移行。 |
| `resources/views/emails/circles/reject.blade.php` | `ない` | - | 却下 mail は未移行。 |
| `resources/views/emails/circles/submit.blade.php` | `ない` | - | submit 通知 mail は未移行。 |
| `resources/views/emails/contacts/category.blade.php` | `部分的にある` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`backend/internal/domain/mailqueue/repository.go` | カテゴリ向け問い合わせメールは queue 化。 |
| `resources/views/emails/contacts/contact.blade.php` | `部分的にある` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`backend/internal/domain/mailqueue/repository.go` | 問い合わせメールは queue 化。 |
| `resources/views/emails/emails/send_email_service.blade.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_mails.go`<br>`backend/internal/domain/mailqueue/repository.go` | 汎用メール送信は queue 化。 |
| `resources/views/emails/forms/answer_confirmation.blade.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_form_answers.go` | 回答確認メール責務は一部 queue 化。 |
| `resources/views/emails/includes/question_email.blade.php` | `部分的にある` | `backend/internal/presentation/httpapi/staff_form_answers.go` | メール本文部品の責務は handler/worker に吸収。 |
| `resources/views/emails/install/test_mail.blade.php` | `ない` | - | install test mail は未移行。 |
| `resources/views/errors/401.blade.php` | `ない` | - | Laravel error page 群の Vue/Go 側対応ファイルは明示されていない。 |
| `resources/views/errors/403.blade.php` | `ない` | - | Laravel error page 群の Vue/Go 側対応ファイルは明示されていない。 |
| `resources/views/errors/404.blade.php` | `部分的にある` | `frontend/src/pages/[...all].vue` | not found 画面は catch-all page に再編。 |
| `resources/views/errors/419.blade.php` | `ない` | - | Laravel error page 群の Vue/Go 側対応ファイルは明示されていない。 |
| `resources/views/errors/429.blade.php` | `ない` | - | Laravel error page 群の Vue/Go 側対応ファイルは明示されていない。 |
| `resources/views/errors/500.blade.php` | `ない` | - | Laravel error page 群の Vue/Go 側対応ファイルは明示されていない。 |
| `resources/views/errors/503.blade.php` | `ない` | - | Laravel error page 群の Vue/Go 側対応ファイルは明示されていない。 |
| `resources/views/errors/layout.blade.php` | `ない` | - | Laravel error layout は未移行。 |
| `resources/views/errors/layout_no_drawer.blade.php` | `ない` | - | Laravel error layout は未移行。 |
| `resources/views/forms/answers/form.blade.php` | `部分的にある` | `frontend/src/pages/workspace/forms/[formId].vue` | participant 回答画面に統合。 |
| `resources/views/forms/list.blade.php` | `ある` | `frontend/src/pages/workspace/forms/index.vue` | participant form 一覧。 |
| `resources/views/home.blade.php` | `ある` | `frontend/src/pages/index.vue` | ホーム画面。 |
| `resources/views/includes/bottom_tabs.blade.php` | `部分的にある` | `frontend/src/components/ui/TabStrip.vue`<br>`frontend/src/components/ui/BottomTabLink.vue` | tab/navigation UI は Vue component へ再編。 |
| `resources/views/includes/circle_info.blade.php` | `部分的にある` | `frontend/src/pages/workspace/circles/`<br>`frontend/src/pages/circles/` | circle UI 部品は Vue page/component に統合。 |
| `resources/views/includes/circle_list_view_item_with_status.blade.php` | `部分的にある` | `frontend/src/pages/workspace/circles/`<br>`frontend/src/pages/circles/` | circle UI 部品は Vue page/component に統合。 |
| `resources/views/includes/circle_register_header.blade.php` | `部分的にある` | `frontend/src/pages/workspace/circles/`<br>`frontend/src/pages/circles/` | circle UI 部品は Vue page/component に統合。 |
| `resources/views/includes/circles_custom_form_instructions.blade.php` | `部分的にある` | `frontend/src/pages/workspace/circles/`<br>`frontend/src/pages/circles/` | circle UI 部品は Vue page/component に統合。 |
| `resources/views/includes/day_calendar.blade.php` | `ない` | - | calendar 部品の新実装は確認できない。 |
| `resources/views/includes/drawer.blade.php` | `部分的にある` | `frontend/src/components/ui/NavMenuLink.vue` | drawer/navigation は Vue app shell に再編。 |
| `resources/views/includes/head_ui_theme.blade.php` | `部分的にある` | `frontend/src/features/session/theme.ts` | テーマ切替は frontend 側へ移動。 |
| `resources/views/includes/head_ui_theme_dark.blade.php` | `部分的にある` | `frontend/src/features/session/theme.ts` | テーマ切替は frontend 側へ移動。 |
| `resources/views/includes/head_ui_theme_light.blade.php` | `部分的にある` | `frontend/src/features/session/theme.ts` | テーマ切替は frontend 側へ移動。 |
| `resources/views/includes/install_header.blade.php` | `ない` | - | install フロー未移行。 |
| `resources/views/includes/loading.blade.php` | `部分的にある` | `frontend/src/components/ui/SurfaceCard.vue` | loading 表示は各 Vue component/page に分散。 |
| `resources/views/includes/participation_forms_list.blade.php` | `部分的にある` | `frontend/src/pages/workspace/circles/`<br>`frontend/src/pages/circles/` | circle UI 部品は Vue page/component に統合。 |
| `resources/views/includes/question.blade.php` | `部分的にある` | `frontend/src/components/forms/AnswerQuestionFields.vue` | 設問描画は Vue component に置換。 |
| `resources/views/includes/staff_answers_tab_strip.blade.php` | `部分的にある` | `frontend/src/components/ui/TabStrip.vue`<br>`frontend/src/components/ui/BottomTabLink.vue` | tab/navigation UI は Vue component へ再編。 |
| `resources/views/includes/staff_circles_tab_strip.blade.php` | `部分的にある` | `frontend/src/components/ui/TabStrip.vue`<br>`frontend/src/components/ui/BottomTabLink.vue` | tab/navigation UI は Vue component へ再編。 |
| `resources/views/includes/staff_home_tab_strip.blade.php` | `部分的にある` | `frontend/src/components/ui/TabStrip.vue`<br>`frontend/src/components/ui/BottomTabLink.vue` | tab/navigation UI は Vue component へ再編。 |
| `resources/views/includes/top_circle_selector.blade.php` | `部分的にある` | `frontend/src/pages/workspace/circles/`<br>`frontend/src/pages/circles/` | circle UI 部品は Vue page/component に統合。 |
| `resources/views/includes/user_register_form.blade.php` | `部分的にある` | `frontend/src/pages/register.vue` | 専用部分テンプレートではなく Vue page に統合。 |
| `resources/views/includes/user_settings_tab_strip.blade.php` | `部分的にある` | `frontend/src/components/ui/TabStrip.vue`<br>`frontend/src/components/ui/BottomTabLink.vue` | tab/navigation UI は Vue component へ再編。 |
| `resources/views/install/admin/form.blade.php` | `ない` | - | install view は未移行。 |
| `resources/views/install/database/form.blade.php` | `ない` | - | install view は未移行。 |
| `resources/views/install/index.blade.php` | `ない` | - | install view は未移行。 |
| `resources/views/install/mail/form.blade.php` | `ない` | - | install view は未移行。 |
| `resources/views/install/mail/test.blade.php` | `ない` | - | install view は未移行。 |
| `resources/views/install/portal/form.blade.php` | `ない` | - | install view は未移行。 |
| `resources/views/layouts/app.blade.php` | `部分的にある` | `frontend/src/pages/`<br>`frontend/src/components/ui/` | layout 責務は Vue app shell と各 page に分散。 |
| `resources/views/layouts/legacy.blade.php` | `部分的にある` | `frontend/src/pages/`<br>`frontend/src/components/ui/` | layout 責務は Vue app shell と各 page に分散。 |
| `resources/views/layouts/no_drawer.blade.php` | `部分的にある` | `frontend/src/pages/`<br>`frontend/src/components/ui/` | layout 責務は Vue app shell と各 page に分散。 |
| `resources/views/pages/list.blade.php` | `ある` | `frontend/src/pages/workspace/pages/index.vue` | participant page 一覧。 |
| `resources/views/pages/show.blade.php` | `ある` | `frontend/src/pages/workspace/pages/[pageId].vue` | participant page 詳細。 |
| `resources/views/privacy_policy.blade.php` | `ある` | `frontend/src/pages/privacy_policy.vue`<br>`resources/md/privacy_policy.md` | privacy policy は Vue page + markdown 読み込みへ置換。 |
| `resources/views/staff/about.blade.php` | `ある` | `frontend/src/pages/staff/about.vue` | about。 |
| `resources/views/staff/circles/data_grid.blade.php` | `部分的にある` | `frontend/src/pages/staff/circles/index.vue` | table/pagination は一覧画面に内包。 |
| `resources/views/staff/circles/form.blade.php` | `部分的にある` | `frontend/src/pages/staff/circles/index.vue`<br>`frontend/src/pages/staff/circles/[circleId].vue` | create/edit が分離。 |
| `resources/views/staff/circles/index.blade.php` | `ある` | `frontend/src/pages/staff/circles/index.vue` | 一覧画面。 |
| `resources/views/staff/circles/participation_types/create.blade.php` | `部分的にある` | `frontend/src/pages/staff/participation-types/index.vue` | inline create。 |
| `resources/views/staff/circles/participation_types/edit.blade.php` | `ある` | `frontend/src/pages/staff/participation-types/[typeId].vue` | edit。 |
| `resources/views/staff/circles/participation_types/form/edit.blade.php` | `部分的にある` | `frontend/src/pages/staff/participation-types/[typeId].vue` | form settings は detail 内に統合。 |
| `resources/views/staff/circles/participation_types/form/editor.blade.php` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | 専用 editor はなく generic form editor に統合。 |
| `resources/views/staff/circles/send_emails/form.blade.php` | `部分的にある` | `frontend/src/pages/staff/circles/[circleId].vue` | circle detail の mail section に統合。控えメールは未移行。 |
| `resources/views/staff/circles/selector.blade.php` | `ない` | - | 指定対象範囲で直接対応する新画面は確認できない。 |
| `resources/views/staff/contacts/categories/delete.blade.php` | `部分的にある` | `frontend/src/pages/staff/contact-categories.vue` | delete confirm 専用 page は廃止。 |
| `resources/views/staff/contacts/categories/form.blade.php` | `部分的にある` | `frontend/src/pages/staff/contact-categories.vue` | inline create/edit。 |
| `resources/views/staff/contacts/categories/index.blade.php` | `ある` | `frontend/src/pages/staff/contact-categories.vue` | 一覧画面。 |
| `resources/views/staff/documents/form.blade.php` | `部分的にある` | `frontend/src/pages/staff/documents/index.vue`<br>`frontend/src/pages/staff/documents/[documentId]/edit.vue` | create/edit に分離。 |
| `resources/views/staff/documents/index.blade.php` | `ある` | `frontend/src/pages/staff/documents/index.vue` | 一覧画面。 |
| `resources/views/staff/forms/answers/form.blade.php` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/answers/create.vue`<br>`frontend/src/pages/staff/forms/[formId]/answers/[answerId]/edit.vue` | create/edit に分割。 |
| `resources/views/staff/forms/answers/index.blade.php` | `ある` | `frontend/src/pages/staff/forms/[formId]/answers/index.vue` | 回答一覧。 |
| `resources/views/staff/forms/answers/notanswered/index.blade.php` | `ある` | `frontend/src/pages/staff/forms/[formId]/not_answered.vue` | 未回答一覧。 |
| `resources/views/staff/forms/answers/uploads/index.blade.php` | `ある` | `frontend/src/pages/staff/forms/[formId]/answers/uploads.vue` | uploads ZIP。 |
| `resources/views/staff/forms/copy/index.blade.php` | `部分的にある` | `frontend/src/pages/staff/forms/index.vue`<br>`frontend/src/pages/staff/forms/[formId]/index.vue` | 専用 copy page はなく button 操作へ再編。 |
| `resources/views/staff/forms/editor.blade.php` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | 専用 editor blade は廃止。 |
| `resources/views/staff/forms/editor_frame.blade.php` | `ない` | - | frame 構成は廃止。 |
| `resources/views/staff/forms/form.blade.php` | `部分的にある` | `frontend/src/pages/staff/forms/index.vue`<br>`frontend/src/pages/staff/forms/[formId]/index.vue` | create/edit が分離。 |
| `resources/views/staff/forms/index.blade.php` | `ある` | `frontend/src/pages/staff/forms/index.vue` | 一覧画面。 |
| `resources/views/staff/forms/preview.blade.php` | `ある` | `frontend/src/pages/staff/forms/[formId]/preview.vue` | preview。 |
| `resources/views/staff/home.blade.php` | `ある` | `frontend/src/pages/staff/index.vue` | staff top。 |
| `resources/views/staff/markdown_guide.blade.php` | `ある` | `frontend/src/pages/staff/markdown-guide.vue` | markdown guide。 |
| `resources/views/staff/pages/form.blade.php` | `部分的にある` | `frontend/src/pages/staff/pages/index.vue`<br>`frontend/src/pages/staff/pages/[pageId].vue` | create/edit は一覧 + 詳細に分離。 |
| `resources/views/staff/pages/index.blade.php` | `ある` | `frontend/src/pages/staff/pages/index.vue` | 一覧画面。 |
| `resources/views/staff/permissions/form.blade.php` | `ある` | `frontend/src/pages/staff/permissions/[userId].vue` | 詳細/編集画面。 |
| `resources/views/staff/permissions/index.blade.php` | `ある` | `frontend/src/pages/staff/permissions/index.vue` | 一覧画面。 |
| `resources/views/staff/places/form.blade.php` | `部分的にある` | `frontend/src/pages/staff/places.vue` | inline create/edit。 |
| `resources/views/staff/places/index.blade.php` | `ある` | `frontend/src/pages/staff/places.vue` | 一覧画面。 |
| `resources/views/staff/send_emails/index.blade.php` | `部分的にある` | `frontend/src/pages/staff/mails.vue` | generic mail queue 化。cancel は未移行。 |
| `resources/views/staff/tags/delete.blade.php` | `部分的にある` | `frontend/src/pages/staff/tags.vue` | delete confirm 専用 page は廃止。 |
| `resources/views/staff/tags/form.blade.php` | `部分的にある` | `frontend/src/pages/staff/tags.vue` | inline create/edit。 |
| `resources/views/staff/tags/index.blade.php` | `ある` | `frontend/src/pages/staff/tags.vue` | 一覧画面。 |
| `resources/views/staff/users/form.blade.php` | `ある` | `frontend/src/pages/staff/users/[userId].vue` | 詳細/編集画面。 |
| `resources/views/staff/users/index.blade.php` | `ある` | `frontend/src/pages/staff/users/index.vue` | 一覧画面。 |
| `resources/views/staff/verify/index.blade.php` | `ある` | `frontend/src/pages/staff/verify.vue` | verify。 |
| `resources/views/support.blade.php` | `ある` | `frontend/src/pages/support.vue` | support page は Vue 化済み。 |
| `resources/views/users/appearance.blade.php` | `ある` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/theme.ts` | 外観設定画面。 |
| `resources/views/users/change_password.blade.php` | `ある` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/password.ts` | パスワード変更画面。 |
| `resources/views/users/delete.blade.php` | `部分的にある` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/deleteAccount.ts` | 削除確認専用 page は settings 内フローに統合。 |
| `resources/views/users/edit.blade.php` | `ある` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/profile.ts` | プロフィール編集画面。 |
| `resources/views/users/register.blade.php` | `部分的にある` | `frontend/src/pages/register.vue` | 登録画面はあるが backend は未移行。 |
| `resources/views/vendor/mail/html/button.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/html/footer.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/html/header.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/html/layout.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/html/message.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/html/panel.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/html/promotion.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/html/promotion/button.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/html/subcopy.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/html/table.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/html/themes/default.css` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/text/button.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/text/footer.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/text/header.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/text/layout.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/text/message.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/text/panel.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/text/promotion.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/text/promotion/button.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/text/subcopy.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/mail/text/table.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/notifications/email.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/self-update/mails/update-available.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |
| `resources/views/vendor/self-update/self-update.blade.php` | `ない` | - | Laravel vendor view override は不採用。 |

## resources/js

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `resources/js/forms_editor/EditorApp.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor app は staff form detail に統合。 |
| `resources/js/forms_editor/components/EditorContent.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/EditorError.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/EditorHeader.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/EditorLoading.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/EditorSidebar.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/form/EditPanel.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/form/FormHeader.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/form/FormItem.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/form/QuestionCheckbox.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/form/QuestionHeading.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/form/QuestionNumber.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/form/QuestionRadio.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/form/QuestionSelect.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/form/QuestionText.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/form/QuestionTextarea.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/components/form/QuestionUpload.vue` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor UI は detail page に統合。 |
| `resources/js/forms_editor/index.js` | `部分的にある` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor entry は staff form detail に統合。 |
| `resources/js/forms_editor/store/api/index.js` | `部分的にある` | `frontend/src/features/staff/forms/api.ts` | editor state/repository は feature API と page state に再編。 |
| `resources/js/forms_editor/store/api/repository.js` | `部分的にある` | `frontend/src/features/staff/forms/api.ts` | editor state/repository は feature API と page state に再編。 |
| `resources/js/forms_editor/store/editor.js` | `部分的にある` | `frontend/src/features/staff/forms/api.ts` | editor state/repository は feature API と page state に再編。 |
| `resources/js/forms_editor/store/index.js` | `部分的にある` | `frontend/src/features/staff/forms/api.ts` | editor state/repository は feature API と page state に再編。 |
| `resources/js/forms_editor/store/status.js` | `部分的にある` | `frontend/src/features/staff/forms/api.ts` | editor state/repository は feature API と page state に再編。 |
| `resources/js/v2/app.js` | `部分的にある` | `frontend/src/app/main.ts` | SPA bootstrap は Vite/Vue app へ移行。 |
| `resources/js/v2/components/AppAccordion.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppBadge.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppChip.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppChipsContainer.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppContainer.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppDropdown.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppDropdownItem.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppFixedFormFooter.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppFooter.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppHeader.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppInfoBox.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppNavBar.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppNavBarBack.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppNavBarToggle.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppTabs.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/AppearanceSettings.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/CardLink.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/CircleSelectorDropdown.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/ContentIframe.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/DataGrid.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/DataGridEditor.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/DataGridFilter.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/DataGridFilterAddDropdown.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/DataGridShortcutLink.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/DataGridTable.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/FormWithConfirm.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/Forms/QuestionCheckbox.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/Forms/QuestionHeading.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/Forms/QuestionItem.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/Forms/QuestionNumber.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/Forms/QuestionRadio.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/Forms/QuestionSelect.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/Forms/QuestionText.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/Forms/QuestionTextarea.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/Forms/QuestionUpload.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/HomeHeader.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/IconButton.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/InstallMailSettingsForm.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | install 自体は未移行だが UI 部品責務は Vue component/page 再構成に吸収。 |
| `resources/js/v2/components/LayoutColumn.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/LayoutRow.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/ListView.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/ListViewActionBtn.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/ListViewBaseItem.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/ListViewCard.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/ListViewEmpty.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/ListViewFormGroup.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/ListViewItem.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/ListViewPagination.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/ListViewStudentIdAndUnivemailInput.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/MarkdownEditor.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/MarkdownEditorIcons.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/PermissionsSelector.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/SearchInput.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/SideWindow.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/SideWindowContainer.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/StepsList.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/StepsListItem.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/TagsInput.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/TopAlert.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/components/UiPrimaryColorPicker.vue` | `部分的にある` | `frontend/src/components/`<br>`frontend/src/pages/` | Vue 3 側 component/page に再構成。1:1 対応ではない。 |
| `resources/js/v2/utils/formDisabling.js` | `部分的にある` | `frontend/src/components/forms/AnswerQuestionFields.vue`<br>`frontend/src/pages/staff/forms/[formId]/index.vue` | フォーム無効化の振る舞いは各 component/page に分散。 |
| `resources/js/v2/vue-turbolinks.js` | `ない` | - | Turbolinks 前提は廃止。 |

## resources/sass

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `resources/sass/_variables.scss` | `部分的にある` | `frontend/src/styles/app.css` | スタイル責務は frontend 全体 CSS に再編。 |
| `resources/sass/app.scss` | `部分的にある` | `frontend/src/styles/app.css` | スタイル責務は frontend 全体 CSS に再編。 |
| `resources/sass/bootstrap.scss` | `ない` | - | Bootstrap ベース構成は不採用。 |
| `resources/sass/forms_editor.scss` | `部分的にある` | `frontend/src/styles/app.css` | スタイル責務は frontend 全体 CSS に再編。 |
| `resources/sass/v2/_normalize.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/_variables.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/app.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/layout/_base.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/layout/_content.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/layout/_drawer.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/layout/_error.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/layout/_main_wrapper.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/libs/_v-tooltip.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/modules/_bottom_tabs.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/modules/_btn.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/modules/_day_calendar.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/modules/_forms.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/modules/_jumbotron.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/modules/_loading.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/modules/_markdown.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/modules/_qrcode.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/modules/_tab_strip.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/modules/_wysiwyg.sass` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/utils/_link.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/utils/_pull.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/utils/_screenreader.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/utils/_spacing.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |
| `resources/sass/v2/utils/_text.scss` | `部分的にある` | `frontend/src/styles/app.css` | v2 の layout/module/utils は Tailwind/CSS 側へ再実装。1:1 対応ではない。 |

## resources/md

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `resources/md/privacy_policy.md` | `ある` | `frontend/src/pages/privacy_policy.vue` | markdown を raw import して表示。 |

## resources/img

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `resources/img/dropdownTriangle.svg` | `ない` | - | 新 `frontend/public` 相当は未整備で、明示的な移行先を確認できない。 |
| `resources/img/dropdownTriangleDark.svg` | `ない` | - | 新 `frontend/public` 相当は未整備で、明示的な移行先を確認できない。 |
| `resources/img/portalDotsLogoDark.svg` | `ない` | - | 新 `frontend/public` 相当は未整備で、明示的な移行先を確認できない。 |
| `resources/img/portalDotsLogoLight.svg` | `ない` | - | 新 `frontend/public` 相当は未整備で、明示的な移行先を確認できない。 |

## config

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `config/activitylog.php` | `部分的にある` | `backend/db/migrations/0003_activity_logs.sql`<br>`backend/internal/domain/activitylog/repository.go`<br>`frontend/src/features/staff/admin/activityLogs.ts` | activity log は移行。Spatie 設定単位ではない。 |
| `config/app.php` | `部分的にある` | `backend/internal/platform/config/config.go`<br>`backend/cmd/api/main.go`<br>`frontend/src/pages/staff/settings/portal.vue` | APP 名/URL/HTTPS/ポータル設定は Go 側へ移行。service provider/alias/locale bootstrap は 1:1 なし。 |
| `config/auth.php` | `部分的にある` | `backend/internal/presentation/httpapi/auth.go`<br>`backend/internal/domain/auth/sqlc.go`<br>`backend/internal/domain/session/sqlc.go`<br>`frontend/src/features/auth/api.ts` | セッション認証は独自実装へ移行。guard/provider/password broker は未移行。 |
| `config/broadcasting.php` | `ない` | - | WebSocket/Broadcast 機能は未実装。 |
| `config/cache.php` | `ない` | - | 汎用 cache 層は未確認。 |
| `config/cors.php` | `ない` | - | 新 backend 側の明示的 CORS 設定ファイルは未確認。 |
| `config/database.php` | `部分的にある` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/migrate.go`<br>`backend/db/migrations/0001_init.sql` | DB 接続・migration は Go 側へ移行。PostgreSQL 前提に再設計。 |
| `config/dotenv-editor.php` | `ない` | - | `.env` 編集 UI/package は未移行。 |
| `config/excel.php` | `部分的にある` | `backend/api/openapi.yaml`<br>`frontend/src/pages/staff/exports.vue` | CSV export は各 API に分散。Excel/import/xlsx/pdf 設定は未移行。 |
| `config/filesystems.php` | `部分的にある` | `backend/api/openapi.yaml`<br>`backend/db/migrations/0004_answer_uploads.sql`<br>`backend/db/migrations/0005_staff_document_uploads.sql` | ファイル upload/download はあるが、disk ではなく PostgreSQL bytea 保存。 |
| `config/hashing.php` | `部分的にある` | `backend/internal/platform/database/seed.go`<br>`backend/go.mod` | bcrypt 利用は継続。hash driver 設定としては移行されない。 |
| `config/logging.php` | `部分的にある` | `backend/cmd/api/main.go`<br>`backend/cmd/worker/main.go` | 基本ログ出力はあるが channel/stack 設定の 1:1 はない。 |
| `config/mail.php` | `部分的にある` | `backend/db/migrations/0002_mail_jobs.sql`<br>`backend/internal/app/worker/mailer.go`<br>`frontend/src/features/staff/admin/mails.ts` | メール送信責務は mail queue + worker に移行。mailer 設定の 1:1 はない。 |
| `config/permission.php` | `部分的にある` | `backend/db/migrations/0016_user_permissions.sql`<br>`backend/internal/domain/staffpermission/definitions.go`<br>`frontend/src/features/staff/access/capabilities.ts`<br>`frontend/src/features/staff/permissions/api.ts` | 権限概念は移行。Spatie package 依存構造は独自実装化。 |
| `config/portal.php` | `部分的にある` | `backend/internal/platform/config/config.go`<br>`backend/internal/domain/portalsetting/repository.go`<br>`backend/internal/presentation/httpapi/staff_portal_settings.go`<br>`frontend/src/features/staff/admin/portalSettings.ts` | ポータル設定の主部分は移行。`enable_demo_mode` は未確認。 |
| `config/queue.php` | `部分的にある` | `backend/db/migrations/0002_mail_jobs.sql`<br>`backend/cmd/worker/main.go`<br>`backend/internal/app/worker/mailer.go` | 汎用 queue ではなく mail queue に用途限定して移行。 |
| `config/sanctum.php` | `部分的にある` | `backend/internal/presentation/httpapi/auth.go`<br>`backend/internal/domain/session/sqlc.go`<br>`frontend/src/features/session/api.ts` | Cookie ベース認証はあるが Sanctum ではない。 |
| `config/services.php` | `ない` | - | 第三者サービス設定の新側対応は未確認。 |
| `config/session.php` | `部分的にある` | `backend/internal/platform/config/config.go`<br>`backend/internal/domain/session/sqlc.go`<br>`backend/db/queries/sessions.sql` | DB セッションと cookie TTL は移行。driver 一覧などは不要化。 |
| `config/view.php` | `ない` | - | Blade/View コンパイルは廃止。 |

## database/migrations

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `database/migrations/2014_10_11_000000_create_fundamental_tables.php` | `部分的にある` | `backend/db/migrations/0001_init.sql`<br>`backend/db/migrations/0006_master_data.sql`<br>`backend/db/migrations/0022_booths.sql` | 主要業務テーブルは移行。旧 roles/session 系は不要化または再設計。 |
| `database/migrations/2014_10_12_000000_create_users_table.php` | `部分的にある` | `backend/db/migrations/0001_init.sql`<br>`backend/db/migrations/0011_user_memberships.sql`<br>`backend/db/migrations/0016_user_permissions.sql`<br>`backend/db/queries/users.sql` | user は移行したが列構成は簡素化・再設計。 |
| `database/migrations/2019_05_11_114945_create_schedules_table.php` | `ない` | - | schedule 機能は Laravel 側でも後に削除。新 backend に対応なし。 |
| `database/migrations/2019_05_14_094310_create_forms_table.php` | `ある` | `backend/db/migrations/0001_init.sql`<br>`backend/db/migrations/0009_form_settings.sql`<br>`backend/db/queries/forms.sql` | forms 本体は移行済み。 |
| `database/migrations/2019_05_14_094627_create_questions_table.php` | `部分的にある` | `backend/db/migrations/0007_form_questions.sql`<br>`backend/db/queries/form_questions.sql` | questions は移行。options は JSONB へ統合。 |
| `database/migrations/2019_05_14_094944_create_options_table.php` | `部分的にある` | `backend/db/migrations/0007_form_questions.sql` | 選択肢は別 table ではなく `form_questions.options` に統合。 |
| `database/migrations/2019_05_14_095201_create_answers_table.php` | `部分的にある` | `backend/db/migrations/0001_init.sql`<br>`backend/db/migrations/0014_answers_multi.sql`<br>`backend/db/queries/answers.sql` | answer は移行。複数回答対応は再設計。 |
| `database/migrations/2019_05_14_095233_create_answer_details_table.php` | `ある` | `backend/db/migrations/0008_answer_details.sql`<br>`backend/db/queries/answers.sql` | answer detail は移行済み。 |
| `database/migrations/2019_08_19_000000_create_failed_jobs_table.php` | `ない` | - | Laravel 汎用 queue 失敗管理は未採用。 |
| `database/migrations/2019_12_11_001433_add_is_leader_to_circle_user.php` | `ある` | `backend/db/migrations/0011_user_memberships.sql`<br>`backend/db/queries/circles.sql` | `circle_user.is_leader` は移行済み。 |
| `database/migrations/2019_12_15_112737_make_description_of_forms_nullable.php` | `ない` | - | forms.description nullable 差分は引き継がれていない。 |
| `database/migrations/2019_12_16_134839_create_emails_table.php` | `部分的にある` | `backend/db/migrations/0002_mail_jobs.sql`<br>`backend/internal/app/worker/mailer.go` | `emails` ではなく `mail_jobs` へ再設計。 |
| `database/migrations/2019_12_17_000010_drop_options_table.php` | `部分的にある` | `backend/db/migrations/0007_form_questions.sql` | 別 table 廃止の結論は引き継がれ、初めから JSONB options で実装。 |
| `database/migrations/2019_12_17_140054_add_options_to_questions.php` | `ある` | `backend/db/migrations/0007_form_questions.sql` | question options の責務は移行済み。 |
| `database/migrations/2020_01_01_215414_add_is_signed_up_to_users.php` | `ない` | - | user の sign-up 状態列は新 schema で未採用。 |
| `database/migrations/2020_03_03_225623_change_is_signed_up.php` | `ない` | - | `signed_up_at` も新 schema で未採用。 |
| `database/migrations/2020_03_24_175904_create_custom_forms_table.php` | `部分的にある` | `backend/db/migrations/0015_participation_types.sql`<br>`backend/db/queries/forms.sql` | custom_forms 専用 table はなく、参加種別フォーム関連に再編。 |
| `database/migrations/2020_03_24_180220_update_circles_table_for_user_registration.php` | `部分的にある` | `backend/db/migrations/0021_circle_workspace.sql`<br>`backend/db/queries/circles.sql` | invitation/submitted/notes は移行。status 系は未移行。 |
| `database/migrations/2020_03_24_180431_drop_name_column_from_booths_table.php` | `ある` | `backend/db/migrations/0022_booths.sql` | 新 booth schema に name 列なし。 |
| `database/migrations/2020_04_19_164557_create_tags_table.php` | `ある` | `backend/db/migrations/0006_master_data.sql`<br>`backend/db/queries/tags.sql` | tags master は移行済み。 |
| `database/migrations/2020_04_19_164621_create_circle_tag_table.php` | `部分的にある` | `backend/db/migrations/0010_page_visibility_and_relations.sql`<br>`backend/db/queries/circles.sql` | pivot ではなく `circles.tags` 配列へ再設計。 |
| `database/migrations/2020_04_22_184559_add_is_verified_by_staff_column_to_users.php` | `部分的にある` | `backend/db/migrations/0011_user_memberships.sql`<br>`backend/internal/presentation/httpapi/staff_users.go` | verified 概念は `users.is_verified` と staff verify フローへ簡素化して移行。 |
| `database/migrations/2020_05_04_145607_add_is_admin_to_users.php` | `部分的にある` | `backend/db/migrations/0016_user_permissions.sql`<br>`backend/internal/domain/staffpermission/definitions.go` | `is_admin` 列ではなく role/permission モデルに再設計。 |
| `database/migrations/2020_05_27_020759_create_page_viewable_tags_table.php` | `部分的にある` | `backend/db/migrations/0010_page_visibility_and_relations.sql`<br>`backend/db/queries/pages.sql` | pivot ではなく `pages.viewable_tags` 配列へ統合。 |
| `database/migrations/2020_06_02_212931_create_contact_categories_table.php` | `ある` | `backend/db/migrations/0006_master_data.sql`<br>`backend/db/queries/contact_categories.sql` | contact categories は移行済み。 |
| `database/migrations/2020_06_10_175842_add_file_info_columns_to_documents.php` | `部分的にある` | `backend/db/queries/documents.sql`<br>`backend/api/openapi.yaml` | filename/mime_type は保持。size/extension は API で算出。 |
| `database/migrations/2020_06_10_184810_rename_filename_to_path_at_documents.php` | `ない` | - | 新 backend は `filename` 維持で、`path` への rename は採用していない。 |
| `database/migrations/2020_06_13_021339_create_reads_table.php` | `ない` | - | read/unread 追跡 table は未移行。 |
| `database/migrations/2020_06_14_025312_create_form_answerable_tags_table.php` | `部分的にある` | `backend/db/migrations/0009_form_settings.sql`<br>`backend/db/queries/forms.sql` | pivot ではなく `forms.answerable_tags` 配列に移行。 |
| `database/migrations/2020_07_21_213552_add_last_accessed_at_to_users.php` | `ない` | - | `last_accessed_at` 相当列は新 schema で未確認。 |
| `database/migrations/2020_08_23_234631_add_foreign_keys_in_tags.php` | `部分的にある` | `backend/db/migrations/0006_master_data.sql`<br>`backend/db/migrations/0010_page_visibility_and_relations.sql`<br>`backend/db/migrations/0015_participation_types.sql` | tags 自体はあるが、旧 pivot 群の一部は array 列へ置換。 |
| `database/migrations/2020_10_24_161242_add_fulltext_index_to_pages.php` | `部分的にある` | `backend/db/queries/pages.sql` | 検索 API はあるが MySQL ngram fulltext index の 1:1 ではなく LIKE ベース。 |
| `database/migrations/2020_12_06_065242_drop_extra_columns_from_booths_table.php` | `ある` | `backend/db/migrations/0022_booths.sql` | booth を最小構成にする方向は移行済み。 |
| `database/migrations/2020_12_06_204534_add_timestamps_to_places_table.php` | `ある` | `backend/db/migrations/0006_master_data.sql`<br>`backend/db/queries/places.sql` | created_at/updated_at を保持。 |
| `database/migrations/2021_03_09_232637_add_foreign_keys_in_circles.php` | `部分的にある` | `backend/db/migrations/0001_init.sql`<br>`backend/db/migrations/0011_user_memberships.sql`<br>`backend/db/migrations/0022_booths.sql` | circles 参照 FK は概ね最終 schema に吸収。`circle_tag` 側は array 化で 1:1 なし。 |
| `database/migrations/2021_03_09_234725_add_foreign_keys_in_answers.php` | `ある` | `backend/db/migrations/0001_init.sql`<br>`backend/db/migrations/0008_answer_details.sql` | answers/answer_details FK は最終 schema に吸収済み。 |
| `database/migrations/2021_04_25_002148_drop_old_role_tables.php` | `ない` | - | 旧 role tables の cleanup は clean-slate PostgreSQL schema では不要。 |
| `database/migrations/2021_04_25_003007_create_permission_tables.php` | `部分的にある` | `backend/db/migrations/0016_user_permissions.sql`<br>`backend/internal/domain/staffpermission/definitions.go` | permission 機能は移行。ただし Spatie 構造は不採用。 |
| `database/migrations/2021_04_25_121743_drop_ci_sessions_table.php` | `ない` | - | 旧 CI session cleanup は不要。新側は独自 `sessions` table。 |
| `database/migrations/2021_05_11_095506_create_activity_log_table.php` | `部分的にある` | `backend/db/migrations/0003_activity_logs.sql`<br>`backend/db/queries/activity_logs.sql` | activity log は移行。ただし汎用 activitylog schema ではない。 |
| `database/migrations/2021_05_21_134318_drop_created_by_and_updated_by_columns.php` | `ない` | - | この cleanup 後の状態が新 schema に直接反映され、個別 migration は存在しない。 |
| `database/migrations/2021_05_23_012143_add_foreign_keys_in_page_viewable_tags.php` | `ない` | - | `page_viewable_tags` table 自体が array 列設計に置換。 |
| `database/migrations/2021_05_23_015052_add_foreign_keys_in_reads.php` | `ない` | - | reads 機能自体が未移行。 |
| `database/migrations/2021_05_23_120313_add_is_pinned_and_is_public_to_pages.php` | `ある` | `backend/db/migrations/0001_init.sql`<br>`backend/db/queries/pages.sql` | page 公開/固定表示は移行済み。 |
| `database/migrations/2021_11_23_172700_drop_schedules_table.php` | `ない` | - | schedule 廃止後の最終状態を新 schema が前提にしている。 |
| `database/migrations/2021_11_23_172908_drop_schedule_id_column_from_documents_table.php` | `ない` | - | documents に schedule_id を持たない最終形が新 schema の初期状態。 |
| `database/migrations/2022_02_19_172600_add_univemail_columns_to_users.php` | `ない` | - | 大学メールの分割列は user schema として未移行。 |
| `database/migrations/2022_03_12_232724_add_uuid_column_to_failed_jobs.php` | `ない` | - | failed_jobs 自体未移行。 |
| `database/migrations/2022_03_19_121551_create_document_page_table.php` | `部分的にある` | `backend/db/migrations/0010_page_visibility_and_relations.sql`<br>`backend/db/queries/pages.sql` | pivot ではなく `pages.document_ids` 配列へ再設計。 |
| `database/migrations/2022_11_20_142022_add_event_column_to_activity_log_table.php` | `部分的にある` | `backend/db/migrations/0003_activity_logs.sql` | `event` は専用列としてはないが、action/summary へ責務吸収。 |
| `database/migrations/2022_11_20_142023_add_batch_uuid_column_to_activity_log_table.php` | `ない` | - | batch_uuid 相当は新 activity log schema で未確認。 |
| `database/migrations/2023_05_02_135408_create_participation_types_table.php` | `ある` | `backend/db/migrations/0015_participation_types.sql`<br>`backend/db/queries/participation_types.sql`<br>`frontend/src/pages/staff/participation-types/index.vue` | participation types は移行済み。 |
| `database/migrations/2023_05_02_140533_add_participation_type_id_to_circles.php` | `ある` | `backend/db/migrations/0015_participation_types.sql`<br>`backend/db/queries/circles.sql` | circles.participation_type_id は移行済み。 |
| `database/migrations/2023_05_02_141549_create_participation_type_tag_table.php` | `部分的にある` | `backend/db/migrations/0015_participation_types.sql`<br>`backend/db/queries/participation_types.sql` | pivot ではなく `participation_types.tags` 配列に再設計。 |
| `database/migrations/2023_05_03_142350_add_foreign_keys_in_questions.php` | `ある` | `backend/db/migrations/0007_form_questions.sql` | form_questions.form_id FK は新 schema に吸収。 |
| `database/migrations/2023_05_04_123732_add_foreign_keys_in_answers.php` | `ある` | `backend/db/migrations/0001_init.sql` | answers.form_id FK は新 schema に吸収。 |
| `database/migrations/2023_05_04_123939_add_foreign_keys_in_answer_details.php` | `ある` | `backend/db/migrations/0008_answer_details.sql` | answer_details.question_id FK は移行済み。 |
| `database/migrations/2023_05_06_215006_add_confirmation_message_column_to_forms.php` | `ある` | `backend/db/migrations/0009_form_settings.sql`<br>`backend/db/queries/forms.sql` | confirmation_message は移行済み。 |
| `database/migrations/2023_05_24_223230_add_can_change_group_name_to_circles.php` | `ない` | - | `can_change_group_name` 相当列は新 schema で未確認。 |

## database/seeders

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `database/seeders/DatabaseSeeder.php` | `部分的にある` | `backend/internal/platform/database/seed.go`<br>`backend/internal/platform/config/config.go` | Laravel seeder 本体は空だが、新 backend は DB 空時に Go seed を投入。 |

## database/factories

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `database/factories/AnswerDetailFactory.php` | `部分的にある` | `backend/db/migrations/0008_answer_details.sql`<br>`backend/db/queries/answers.sql` | answer detail 実体は移行済み。factory レイヤーなし。 |
| `database/factories/AnswerFactory.php` | `部分的にある` | `backend/db/queries/answers.sql`<br>`backend/db/migrations/0014_answers_multi.sql` | answer 実体は移行済み。factory 仕組みなし。 |
| `database/factories/CircleFactory.php` | `部分的にある` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go` | circle 実体は seed/demo data にあるが、factory 仕組み自体は未移行。 |
| `database/factories/ContactEmailFactory.php` | `部分的にある` | `backend/db/migrations/0002_mail_jobs.sql`<br>`backend/db/queries/contact_categories.sql` | 問い合わせ/メール送信機能はあるが old factory の 1:1 なし。 |
| `database/factories/DocumentFactory.php` | `部分的にある` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go`<br>`backend/db/queries/documents.sql` | document 実体は移行済み。factory は未移行。 |
| `database/factories/EmailFactory.php` | `部分的にある` | `backend/db/migrations/0002_mail_jobs.sql`<br>`backend/internal/app/worker/mailer_test.go` | mail queue テスト根拠はあるが old Email model factory の 1:1 なし。 |
| `database/factories/FormFactory.php` | `部分的にある` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go`<br>`backend/db/queries/forms.sql` | form seed と schema はあるが factory はない。 |
| `database/factories/PageFactory.php` | `部分的にある` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go`<br>`backend/db/queries/pages.sql` | page 実体は移行済み。factory は未移行。 |
| `database/factories/ParticipationTypeFactory.php` | `部分的にある` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go`<br>`backend/db/queries/participation_types.sql` | participation type 実体は移行済み。factory は未移行。 |
| `database/factories/PlaceFactory.php` | `部分的にある` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go`<br>`backend/db/queries/places.sql` | place 実体は移行済み。factory は未移行。 |
| `database/factories/QuestionFactory.php` | `部分的にある` | `backend/db/migrations/0007_form_questions.sql`<br>`backend/db/queries/form_questions.sql` | question 実体は移行済み。factory レイヤーなし。 |
| `database/factories/ReadFactory.php` | `ない` | - | reads 機能自体が未移行。 |
| `database/factories/TagFactory.php` | `部分的にある` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go`<br>`backend/db/queries/tags.sql` | tag 実体は移行済み。factory は未移行。 |
| `database/factories/UserFactory.php` | `部分的にある` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go`<br>`backend/db/queries/users.sql` | user seed はあるが Laravel factory はない。 |

## tests

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `tests/CreatesApplication.php` | `ない` | - | Laravel app bootstrap for tests。 |
| `tests/Feature/CheckPermissionsTest.php` | `部分的にある` | `backend/internal/domain/staffpermission/definitions.go`<br>`frontend/src/features/staff/access/capabilities.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | 権限判定は移行したが Gate/Policy テスト形態ではない。 |
| `tests/Feature/Eloquents/CircleTest.php` | `部分的にある` | `backend/internal/domain/circle/catalog.go`<br>`backend/internal/domain/circle/sqlc.go`<br>`backend/internal/presentation/httpapi/server_test.go` | circle ドメインは移行したが Eloquent model テストではない。 |
| `tests/Feature/Exports/AnswersExportTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/answers/index.test.ts` | answers export は移行。 |
| `tests/Feature/Exports/CirclesExportTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/circles/index.test.ts` | circles export は移行。 |
| `tests/Feature/Exports/DocumentsExportTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/documents/index.test.ts` | documents export は移行。 |
| `tests/Feature/Exports/FormsExportTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/index.test.ts` | forms export は移行。 |
| `tests/Feature/Exports/PagesExportTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/pages/index.test.ts` | pages export は移行。 |
| `tests/Feature/Exports/PlacesExportTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/places.test.ts` | places export は移行。 |
| `tests/Feature/Exports/TagsExportTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/tags.test.ts` | tags export は移行。 |
| `tests/Feature/Exports/UsersExportTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/users/index.test.ts` | users export は移行。 |
| `tests/Feature/GridMakers/DocumentsGridMakerTest.php` | `部分的にある` | `frontend/src/pages/staff/documents/index.test.ts`<br>`backend/db/queries/documents.sql` | documents grid 相当は移行したがクラス単位 1:1 なし。 |
| `tests/Feature/GridMakers/PagesGridMakerTest.php` | `部分的にある` | `backend/db/queries/pages.sql`<br>`frontend/src/pages/staff/pages/index.test.ts` | page 一覧は移行、GridMaker は不採用。 |
| `tests/Feature/GridMakers/UsersGridMakerTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/pagination.go`<br>`frontend/src/pages/staff/users/index.test.ts` | 一覧/ページングは移行したが GridMaker クラスはない。 |
| `tests/Feature/GridMakers/Filter/FilterQueriesTest.php` | `部分的にある` | `backend/db/queries/pages.sql`<br>`backend/internal/presentation/httpapi/pagination.go` | list/filter 自体は API query に移行したが framework は別物。 |
| `tests/Feature/GridMakers/Filter/FilterQueryItemTest.php` | `ない` | - | Laravel filter framework 固有。 |
| `tests/Feature/GridMakers/Filter/FilterableKeyBelongsToManyOptionsTest.php` | `ない` | - | Laravel filter framework 固有。 |
| `tests/Feature/GridMakers/Filter/FilterableKeyBelongsToOptionsTest.php` | `ない` | - | Laravel filter framework 固有。 |
| `tests/Feature/GridMakers/Filter/FilterableKeyTest.php` | `ない` | - | Laravel filter framework 固有。 |
| `tests/Feature/GridMakers/Filter/FilterableKeysDictTest.php` | `ない` | - | Laravel filter framework 固有。 |
| `tests/Feature/Http/Controllers/Auth/LoginControllerTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/login.test.ts` | login フローは移行。 |
| `tests/Feature/Http/Controllers/Circles/BaseTestCase.php` | `ない` | - | Laravel circles controller test 基盤。新構成に 1:1 なし。 |
| `tests/Feature/Http/Controllers/Circles/CreateActionTest.php` | `ある` | `frontend/src/pages/circles/new.test.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | circle create は移行。 |
| `tests/Feature/Http/Controllers/Circles/DeleteActionTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go` | delete action 相当は API にあるが旧 route/UI の 1:1 は弱い。 |
| `tests/Feature/Http/Controllers/Circles/DestroyActionTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go` | participant 自身の circle destroy の UI 対応は明確でなく、API 中心。 |
| `tests/Feature/Http/Controllers/Circles/DoneActionTest.php` | `ない` | - | 旧完了画面専用 route の新側対応は未確認。 |
| `tests/Feature/Http/Controllers/Circles/EditActionTest.php` | `部分的にある` | `frontend/src/pages/workspace/circles/detail.test.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | participant circle edit は移行。 |
| `tests/Feature/Http/Controllers/Circles/ShowActionTest.php` | `部分的にある` | `frontend/src/pages/workspace/circles/detail.test.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | circle 詳細は workspace 画面へ再構成。 |
| `tests/Feature/Http/Controllers/Circles/SubmitActionTest.php` | `部分的にある` | `frontend/src/pages/workspace/circles/detail.test.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | submitted_at は移行。画面/route は再構成。 |
| `tests/Feature/Http/Controllers/Circles/UpdateActionTest.php` | `部分的にある` | `frontend/src/pages/workspace/circles/detail.test.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | circle update は移行。 |
| `tests/Feature/Http/Controllers/Circles/Users/DestroyActionTest.php` | `部分的にある` | `frontend/src/pages/workspace/circles/members.test.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | メンバー削除は移行。 |
| `tests/Feature/Http/Controllers/Circles/Users/StoreActionTest.php` | `部分的にある` | `frontend/src/pages/workspace/circles/members.test.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | メンバー追加/招待 join は移行。 |
| `tests/Feature/Http/Controllers/Contacts/PostActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/contact.test.ts` | contact post は移行。 |
| `tests/Feature/Http/Controllers/Documents/ShowActionTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/documents/index.test.ts` | participant document download はあるが Laravel show page 構造の 1:1 ではない。 |
| `tests/Feature/Http/Controllers/Forms/Answers/CreateActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/forms/[formId].test.ts` | participant answer create 画面は移行。 |
| `tests/Feature/Http/Controllers/Forms/Answers/EditActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/forms/[formId].test.ts` | participant answer edit は移行。 |
| `tests/Feature/Http/Controllers/Forms/Answers/StoreActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/forms/[formId].test.ts` | participant answer submit は移行。 |
| `tests/Feature/Http/Controllers/Forms/Answers/Uploads/ShowActionTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/forms/[formId].test.ts` | participant upload download は移行。 |
| `tests/Feature/Http/Controllers/HomeActionTest.php` | `ある` | `frontend/src/pages/index.test.ts` | ホーム画面は Vue 側に移行。 |
| `tests/Feature/Http/Controllers/Install/HomeActionTest.php` | `ない` | - | install フローは新構成で未確認。 |
| `tests/Feature/Http/Controllers/Pages/IndexActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/pages/index.test.ts` | participant page list は移行。 |
| `tests/Feature/Http/Controllers/Pages/ShowActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/pages/[pageId].test.ts` | participant page detail は移行。 |
| `tests/Feature/Http/Controllers/Staff/Circles/CreateActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/circles/index.test.ts` | staff circle create は移行。 |
| `tests/Feature/Http/Controllers/Staff/Circles/DestroyActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/circles/index.test.ts` | staff circle delete は移行。 |
| `tests/Feature/Http/Controllers/Staff/Circles/EditActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/circles/[circleId].test.ts` | staff circle edit は移行。 |
| `tests/Feature/Http/Controllers/Staff/Circles/ExportActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/circles/index.test.ts` | staff circles export は移行。 |
| `tests/Feature/Http/Controllers/Staff/Documents/DestroyActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/documents/index.test.ts` | staff document delete は移行。 |
| `tests/Feature/Http/Controllers/Staff/Documents/ExportActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/documents/index.test.ts` | staff document export は移行。 |
| `tests/Feature/Http/Controllers/Staff/Documents/ShowActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/documents/[documentId]/edit.test.ts` | staff document detail は移行。 |
| `tests/Feature/Http/Controllers/Staff/Documents/StoreActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/documents/index.test.ts` | staff document upload は移行。 |
| `tests/Feature/Http/Controllers/Staff/Documents/UpdateActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/documents/[documentId]/edit.test.ts` | staff document update は移行。 |
| `tests/Feature/Http/Controllers/Staff/Forms/CopyActionTest.php` | `ない` | - | form copy 機能の新側テスト対応は確認できない。 |
| `tests/Feature/Http/Controllers/Staff/Forms/DestroyActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/index.test.ts` | staff form delete は移行。 |
| `tests/Feature/Http/Controllers/Staff/Forms/Editor/GetQuestionsActionTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/index.test.ts` | form question editor は移行。 |
| `tests/Feature/Http/Controllers/Staff/Forms/ExportActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/index.test.ts` | staff forms export は移行。 |
| `tests/Feature/Http/Controllers/Staff/Forms/Answers/DestroyActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/answers/index.test.ts` | answer delete は移行。 |
| `tests/Feature/Http/Controllers/Staff/Forms/Answers/ExportActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/answers/index.test.ts` | staff form answers export は移行。 |
| `tests/Feature/Http/Controllers/Staff/Forms/Answers/Uploads/DownloadZipActionTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/answers/uploads.test.ts` | ZIP/一括 download 系はあるが Laravel action 1:1 ではない。 |
| `tests/Feature/Http/Controllers/Staff/Forms/Answers/Uploads/ShowActionTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/answers/uploads.test.ts` | upload download は移行。 |
| `tests/Feature/Http/Controllers/Staff/HomeActionTest.php` | `部分的にある` | `frontend/src/pages/staff/index.test.ts` | staff home は Vue ページへ移行。demo mode 分岐は未移行。 |
| `tests/Feature/Http/Controllers/Staff/Pages/DestroyActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/pages/[pageId].test.ts` | staff page delete は移行。 |
| `tests/Feature/Http/Controllers/Staff/Pages/ExportActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/pages/index.test.ts` | staff page export は移行。 |
| `tests/Feature/Http/Controllers/Staff/Pages/StoreActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/pages/index.test.ts` | staff page create は移行。 |
| `tests/Feature/Http/Controllers/Staff/Permissions/UpdateActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/permissions/[userId].test.ts` | staff permissions update は移行。 |
| `tests/Feature/Http/Controllers/Staff/Places/ExportActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/places.test.ts` | staff places export は移行。 |
| `tests/Feature/Http/Controllers/Staff/Tags/DestroyActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/tags.test.ts` | staff tags delete は移行。 |
| `tests/Feature/Http/Controllers/Staff/Tags/ExportActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/tags.test.ts` | staff tags export は移行。 |
| `tests/Feature/Http/Controllers/Staff/Users/ExportActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/users/index.test.ts` | staff users export は移行。 |
| `tests/Feature/Http/Controllers/Staff/Users/UpdateActionTest.php` | `ある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/users/[userId].test.ts` | staff user update は移行。 |
| `tests/Feature/Http/Controllers/Staff/Verify/IndexActionTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/verify.test.ts` | staff verify フローは移行。 |
| `tests/Feature/Http/Controllers/Users/DestroyActionTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/settings.test.ts` | 自己アカウント削除は移行。 |
| `tests/Feature/Http/Middleware/DemoModeTest.php` | `ない` | - | demo mode は新構成で未確認。 |
| `tests/Feature/Http/Responders/Staff/GridResponderTest.php` | `ない` | - | Laravel responder/grid 層は新構成で不採用。 |
| `tests/Feature/Services/Circles/CirclesServiceTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/circles/detail.test.ts`<br>`frontend/src/pages/circles/new.test.ts` | circles 機能は移行したが service class 単位ではない。 |
| `tests/Feature/Services/Contacts/ContactCategoriesServiceTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/contact-categories.test.ts` | contact category 管理は移行。 |
| `tests/Feature/Services/Contacts/ContactsServeceTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/contact.test.ts` | contact 送信/履歴機能は API/UI テストへ移行。 |
| `tests/Feature/Services/Documents/DocumentsServiceTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/documents/index.test.ts`<br>`frontend/src/pages/staff/documents/index.test.ts` | documents 機能は API/UI テストへ移行。 |
| `tests/Feature/Services/Emails/SendEmailsServiceTest.php` | `部分的にある` | `backend/internal/app/worker/mailer_test.go`<br>`frontend/src/pages/staff/mails.test.ts` | mail queue/worker に再設計。 |
| `tests/Feature/Services/Forms/AnswerDetailsServiceTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/forms/[formId].test.ts` | answer_details は新 API に存在。 |
| `tests/Feature/Services/Forms/AnswersServiceTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/forms/[formId].test.ts` | 回答機能は移行したが service 層単位ではない。 |
| `tests/Feature/Services/Forms/DownloadZipServiceTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/answers/uploads.test.ts` | upload download/export 系はあるがサービス名単位の 1:1 はない。 |
| `tests/Feature/Services/Forms/FormsServiceTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/forms/index.test.ts`<br>`frontend/src/pages/staff/forms/index.test.ts` | forms 機能は API/UI に移行。 |
| `tests/Feature/Services/Pages/PagesServiceTest.php` | `部分的にある` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/pages/index.test.ts`<br>`frontend/src/pages/workspace/pages/[pageId].test.ts` | pages 機能は移行したが service class 単位ではなく API/UI テストへ再編。 |
| `tests/Feature/Services/Pages/ReadsServiceTest.php` | `ない` | - | reads 機能未移行。 |
| `tests/Feature/Services/Utils/DotenvServiceTest.php` | `ない` | - | dotenv 編集機能自体が未移行。 |
| `tests/Feature/Services/Utils/FormatTextServiceTest.php` | `ない` | - | 旧 utility service 単位のテストは未移行。 |
| `tests/Feature/Services/Utils/ValueObjects/VersionTest.php` | `ない` | - | 同等の ValueObject テストは未確認。 |
| `tests/TestFile.png` | `ない` | - | Laravel テスト用画像 fixture。新構成で 1:1 の対応先は確認できない。 |
| `tests/TestCase.php` | `ない` | - | Laravel TestCase 基盤。新側は Go test / Vitest を使用。 |
| `tests/Unit/ExampleTest.php` | `ない` | - | Laravel 雛形テスト。 |

## lang

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `lang/en/auth.php` | `ない` | - | 新構成で英語翻訳ファイルは未確認。 |
| `lang/en/pagination.php` | `ない` | - | 英語翻訳ファイルは未移行。 |
| `lang/en/passwords.php` | `ない` | - | 英語 password reset 辞書は未移行。 |
| `lang/en/validation.php` | `ない` | - | 英語 validation 辞書は未移行。 |
| `lang/ja/auth.php` | `部分的にある` | `backend/internal/presentation/httpapi/auth.go`<br>`frontend/src/pages/login.vue` | ログイン失敗文言は新コード側に分散。翻訳ファイルとしての移行はない。 |
| `lang/ja/pagination.php` | `部分的にある` | `backend/internal/presentation/httpapi/pagination.go`<br>`frontend/src/lib/pagination.ts` | pagination ロジックはあるが辞書化はされていない。 |
| `lang/ja/passwords.php` | `部分的にある` | `frontend/src/pages/password/reset.vue`<br>`frontend/src/pages/workspace/settings.vue` | パスワード変更 UI はあるが reset mail フローは未移行。 |
| `lang/ja/validation.php` | `部分的にある` | `backend/internal/presentation/httpapi/auth.go`<br>`backend/internal/presentation/httpapi/contact_profile.go`<br>`frontend/src/lib/api/validation.ts` | バリデーション文言は endpoint/UI ごとに分散。 |

## bootstrap, public, artisan, composer.json, composer.lock, phpunit.xml, phpcs.xml

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `bootstrap/app.php` | `部分的にある` | `backend/cmd/api/main.go`<br>`backend/internal/platform/database/dependencies.go` | アプリ初期化/IoC 相当は Go の dependency 構築へ移行。 |
| `public/index.php` | `部分的にある` | `backend/cmd/api/main.go`<br>`frontend/src/app/main.ts` | HTTP entrypoint は Go API + Vue SPA に分離。 |
| `public/.htaccess` | `ない` | - | Apache rewrite/PHP upload 制御は不要化。 |
| `public/robots.txt` | `ない` | - | 新 frontend 公開物として未整備。 |
| `public/favicon.ico` | `ない` | - | 新 frontend 側の favicon 配置は未確認。 |
| `public/.user.ini` | `ない` | - | PHP upload 制限設定は不要化。 |
| `artisan` | `部分的にある` | `backend/cmd/migrate/main.go`<br>`backend/cmd/worker/main.go`<br>`mise.toml` | CLI entry は migrate/worker/mise task に分散。汎用 artisan 相当はない。 |
| `composer.json` | `部分的にある` | `backend/go.mod`<br>`frontend/package.json`<br>`packages/api-client/package.json`<br>`package.json`<br>`mise.toml` | 依存と scripts は分散移行。Laravel/Sanctum/Spatie/Excel などは独自実装または未移行。 |
| `composer.lock` | `部分的にある` | `backend/go.mod`<br>`frontend/package.json`<br>`packages/api-client/package.json` | manifest は分散したが、候補範囲内に厳密な lockfile 対応はない。 |
| `phpunit.xml` | `部分的にある` | `mise.toml`<br>`frontend/package.json`<br>`backend/internal/presentation/httpapi/server_test.go` | テスト実行基盤は Go test / Vitest / mise task に移行。 |
| `phpcs.xml` | `部分的にある` | `mise.toml`<br>`frontend/package.json` | 静的解析/整形は Go/Vue 側ツールへ移行。 |


## 主な未対応/部分移行の論点

- 認証系では register、password reset 本番フロー、email verify backend が未移行で、画面先行の箇所が残る。
- staff 側は大半が移行済みだが、`send_emails` の queue 全削除、forms editor/frame の旧専用構成、circle 宛メールのスタッフ控え送信は未移行。
- `reads`、`release info`、install フロー、broadcasting、Laravel 固有 provider/responders/grid/filter 基盤は未移行か、Go/Vue の別設計へ置換されている。
- database は主要業務テーブルを移行済みだが、pivot table の多くが配列列へ再設計され、`failed_jobs`、`schedule`、`last_accessed_at`、`univemail`、`circle status` 系は未対応が残る。
- `public/robots.txt`、`public/favicon.ico`、英語翻訳ファイル、factory レイヤー、旧 Laravel 層別テストの一部は新構成で未整備。
