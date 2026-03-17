# Laravel -> Vue/Go Migration Mapping

## Scope of Investigation

- Legacy Laravel/PHP implementation: `routes/`, `app/`, `resources/`, `config/`, `database/`, `bootstrap/`, `public/`, `lang/`, `tests/`, `artisan`, `composer.json`, `composer.lock`, `phpunit.xml`, `phpcs.xml`
- Primary destinations in the new implementation: `frontend/src/`, `backend/internal/`, `backend/db/`, `backend/cmd/`, `mise.toml`, each `package.json`
- Evaluation criteria: prioritize whether the feature exists in the new implementation. Even when it is not a 1:1 port, mark it as `Present` or `Partial` if the responsibility has effectively been carried over.
- Notation: Laravel-side paths are normalized to repo-relative paths, and each Laravel-side file is listed on its own row by default.

## Status Legend

| Status | Meaning |
|---|---|
| `Present` | An effective migration target exists, and the main responsibility is established on the Vue/Go side. |
| `Partial` | The feature exists, but responsibilities may be split, the UI may be merged, URLs may have changed, the design may differ, or some parts are still missing. |
| `Missing` | No corresponding implementation could be confirmed on the Vue/Go side within the investigated scope. |

## routes

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `routes/api.php` | `Partial` | `backend/internal/presentation/httpapi/routes.go`<br>`frontend/src/features/` | The API has been migrated from Laravel controllers to Go HTTP API. Endpoint names and responsibility division are not 1:1. |
| `routes/channels.php` | `Missing` | - | The broadcasting/channel mechanism cannot be confirmed. |
| `routes/console.php` | `Partial` | `backend/cmd/migrate/main.go`<br>`backend/cmd/worker/main.go`<br>`mise.toml` | Distributed to Go command and mise task instead of Artisan console route. |
| `routes/install.php` | `Missing` | - | The install flow has not yet been migrated in the new stack. |
| `routes/staff.php` | `Partial` | `backend/internal/presentation/httpapi/routes.go`<br>`frontend/src/pages/staff/` | The main staff/admin functions have been migrated. The route structure was reorganized from `/admin` to `/staff`, the old forms editor/frame setup was removed, and full `send_emails` deletion is still missing. |
| `routes/web.php` | `Partial` | `backend/internal/presentation/httpapi/routes.go`<br>`frontend/src/app/router/index.ts`<br>`frontend/src/pages/` | Most public/workspace/staff screens have been moved to Vue. register/reset/email verify remain UI-first, and some backend pieces are still missing. |
## app/Http/Controllers

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Http/Controllers/Controller.php` | `Missing` | - | Laravel base controller. There is no 1:1 base class in the new stack. |
| `app/Http/Controllers/HomeAction.php` | `Present` | `frontend/src/pages/index.vue` | The home screen has been converted to Vue. |
| `app/Http/Controllers/Staff/AboutAction.php` | `Present` | `frontend/src/pages/staff/about.vue` | About page. |
| `app/Http/Controllers/Staff/HomeAction.php` | `Present` | `frontend/src/pages/staff/index.vue` | Staff top page. |
| `app/Http/Controllers/Staff/Verify/IndexAction.php` | `Present` | `frontend/src/pages/staff/verify.vue`<br>`frontend/src/features/staff/status/api.ts`<br>`backend/internal/presentation/httpapi/staff_verify.go` | staff verify screen. |
| `app/Http/Controllers/Staff/Verify/VerifyAction.php` | `Present` | `frontend/src/features/staff/status/api.ts`<br>`backend/internal/presentation/httpapi/staff_verify.go` | staff verify execution API. Authentication code delivery is currently mock. |
| `app/Http/Controllers/Staff/Pages/ApiAction.php` | `Present` | `frontend/src/features/staff/pages/api.ts`<br>`backend/internal/presentation/httpapi/staff_pages.go` | Pages API. |
| `app/Http/Controllers/Staff/Pages/CreateAction.php` | `Partial` | `frontend/src/pages/staff/pages/index.vue` | Reworked to create within the list page instead of using a dedicated create page. |
| `app/Http/Controllers/Staff/Pages/DestroyAction.php` | `Present` | `frontend/src/features/staff/pages/api.ts`<br>`backend/internal/presentation/httpapi/staff_pages.go` | Delete API. |
| `app/Http/Controllers/Staff/Pages/EditAction.php` | `Present` | `frontend/src/pages/staff/pages/[pageId].vue`<br>`frontend/src/features/staff/pages/api.ts` | Edit page. |
| `app/Http/Controllers/Staff/Pages/ExportAction.php` | `Present` | `frontend/src/pages/staff/pages/index.vue`<br>`frontend/src/features/staff/pages/api.ts`<br>`backend/internal/presentation/httpapi/staff_pages.go` | CSV export. |
| `app/Http/Controllers/Staff/Pages/IndexAction.php` | `Present` | `frontend/src/pages/staff/pages/index.vue`<br>`frontend/src/pages/staff/pages/[pageId].vue`<br>`frontend/src/features/staff/pages/api.ts`<br>`backend/internal/presentation/httpapi/staff_pages.go` | List page. |
| `app/Http/Controllers/Staff/Pages/PatchPinAction.php` | `Present` | `frontend/src/pages/staff/pages/[pageId].vue`<br>`frontend/src/features/staff/pages/api.ts` | pin/unpin update. |
| `app/Http/Controllers/Staff/Pages/StoreAction.php` | `Present` | `frontend/src/features/staff/pages/api.ts`<br>`backend/internal/presentation/httpapi/staff_pages.go` | Create API. |
| `app/Http/Controllers/Staff/Pages/UpdateAction.php` | `Present` | `frontend/src/features/staff/pages/api.ts`<br>`backend/internal/presentation/httpapi/staff_pages.go` | Update API. |
| `app/Http/Controllers/Staff/Forms/ApiAction.php` | `Present` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | Forms API. |
| `app/Http/Controllers/Staff/Forms/CopyAction.php` | `Present` | `frontend/src/pages/staff/forms/index.vue`<br>`frontend/src/pages/staff/forms/[formId]/index.vue`<br>`backend/internal/presentation/httpapi/staff_forms.go` | copy has been reorganized into a button operation. |
| `app/Http/Controllers/Staff/Forms/CreateAction.php` | `Partial` | `frontend/src/pages/staff/forms/index.vue` | Reworked to create within the list page instead of using a dedicated create page. |
| `app/Http/Controllers/Staff/Forms/DestroyAction.php` | `Present` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | Delete API. |
| `app/Http/Controllers/Staff/Forms/EditAction.php` | `Present` | `frontend/src/pages/staff/forms/[formId]/index.vue` | Detail/edit page. |
| `app/Http/Controllers/Staff/Forms/ExportAction.php` | `Present` | `frontend/src/pages/staff/forms/index.vue`<br>`backend/internal/presentation/httpapi/staff_forms.go` | CSV export. |
| `app/Http/Controllers/Staff/Forms/IndexAction.php` | `Present` | `frontend/src/pages/staff/forms/index.vue`<br>`frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | List page. |
| `app/Http/Controllers/Staff/Forms/PreviewAction.php` | `Present` | `frontend/src/pages/staff/forms/[formId]/preview.vue`<br>`frontend/src/features/staff/forms/api.ts` | Preview page. |
| `app/Http/Controllers/Staff/Forms/StoreAction.php` | `Present` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | Create API. |
| `app/Http/Controllers/Staff/Forms/UpdateAction.php` | `Present` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | Update API. |
| `app/Http/Controllers/Staff/Forms/Editor/APIAction.php` | `Partial` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | Laravel old API responsibilities are split into multiple APIs. |
| `app/Http/Controllers/Staff/Forms/Editor/AddQuestionAction.php` | `Present` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | Added question. |
| `app/Http/Controllers/Staff/Forms/Editor/DeleteQuestionAction.php` | `Present` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | question deleted. |
| `app/Http/Controllers/Staff/Forms/Editor/FrameAction.php` | `Missing` | - | The dedicated iframe/frame implementation was removed. |
| `app/Http/Controllers/Staff/Forms/Editor/GetFormAction.php` | `Present` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | Get form detail. |
| `app/Http/Controllers/Staff/Forms/Editor/GetQuestionsAction.php` | `Present` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | Questions retrieval is integrated into the details payload. |
| `app/Http/Controllers/Staff/Forms/Editor/IndexAction.php` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue`<br>`frontend/src/features/staff/forms/api.ts` | Integrated into details screen instead of dedicated editor route. |
| `app/Http/Controllers/Staff/Forms/Editor/UpdateFormAction.php` | `Present` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | form update. |
| `app/Http/Controllers/Staff/Forms/Editor/UpdateQuestionAction.php` | `Present` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | question updated. |
| `app/Http/Controllers/Staff/Forms/Editor/UpdateQuestionsOrderAction.php` | `Present` | `frontend/src/features/staff/forms/api.ts`<br>`backend/internal/presentation/httpapi/staff_forms.go` | question sort. |
| `app/Http/Controllers/Staff/Forms/Answers/ApiAction.php` | `Present` | `frontend/src/features/staff/forms/answers.ts`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | Answers API. |
| `app/Http/Controllers/Staff/Forms/Answers/CreateAction.php` | `Present` | `frontend/src/pages/staff/forms/[formId]/answers/create.vue` | Create page. |
| `app/Http/Controllers/Staff/Forms/Answers/DestroyAction.php` | `Present` | `frontend/src/features/staff/forms/answers.ts`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | Delete API. |
| `app/Http/Controllers/Staff/Forms/Answers/EditAction.php` | `Present` | `frontend/src/pages/staff/forms/[formId]/answers/[answerId]/edit.vue` | Edit page. |
| `app/Http/Controllers/Staff/Forms/Answers/ExportAction.php` | `Present` | `frontend/src/pages/staff/forms/[formId]/answers/index.vue`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | CSV export. |
| `app/Http/Controllers/Staff/Forms/Answers/IndexAction.php` | `Present` | `frontend/src/pages/staff/forms/[formId]/answers/index.vue`<br>`frontend/src/features/staff/forms/answers.ts`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | Answer list page. |
| `app/Http/Controllers/Staff/Forms/Answers/StoreAction.php` | `Present` | `frontend/src/features/staff/forms/answers.ts`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | Create API. |
| `app/Http/Controllers/Staff/Forms/Answers/UpdateAction.php` | `Present` | `frontend/src/features/staff/forms/answers.ts`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | Update API. |
| `app/Http/Controllers/Staff/Forms/Answers/NotAnswered/ShowAction.php` | `Present` | `frontend/src/pages/staff/forms/[formId]/not_answered.vue`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | Unanswered list page. |
| `app/Http/Controllers/Staff/Forms/Answers/Uploads/DownloadZipAction.php` | `Present` | `frontend/src/pages/staff/forms/[formId]/answers/uploads.vue`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | ZIP download. |
| `app/Http/Controllers/Staff/Forms/Answers/Uploads/IndexAction.php` | `Present` | `frontend/src/pages/staff/forms/[formId]/answers/uploads.vue`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | Uploads landing page. |
| `app/Http/Controllers/Staff/Forms/Answers/Uploads/ShowAction.php` | `Present` | `frontend/src/features/staff/forms/answers.ts`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | Single attachment download. |
| `app/Http/Controllers/Staff/Users/ApiAction.php` | `Present` | `frontend/src/features/staff/users/api.ts`<br>`backend/internal/presentation/httpapi/staff_users.go` | Users API. |
| `app/Http/Controllers/Staff/Users/DestroyAction.php` | `Present` | `frontend/src/features/staff/users/api.ts`<br>`backend/internal/presentation/httpapi/staff_users.go` | Delete API. |
| `app/Http/Controllers/Staff/Users/EditAction.php` | `Present` | `frontend/src/pages/staff/users/[userId].vue` | Edit page. |
| `app/Http/Controllers/Staff/Users/ExportAction.php` | `Present` | `frontend/src/pages/staff/users/index.vue`<br>`backend/internal/presentation/httpapi/staff_users.go` | CSV export. |
| `app/Http/Controllers/Staff/Users/IndexAction.php` | `Present` | `frontend/src/pages/staff/users/index.vue`<br>`frontend/src/features/staff/users/api.ts`<br>`backend/internal/presentation/httpapi/staff_users.go` | List page. |
| `app/Http/Controllers/Staff/Users/UpdateAction.php` | `Present` | `frontend/src/features/staff/users/api.ts`<br>`backend/internal/presentation/httpapi/staff_users.go` | Update API. |
| `app/Http/Controllers/Staff/Users/VerifiedAction.php` | `Present` | `frontend/src/pages/staff/users/[userId].vue`<br>`frontend/src/features/staff/users/api.ts`<br>`backend/internal/presentation/httpapi/staff_users.go` | Manual identity verification. |
| `app/Http/Controllers/Staff/Permissions/ApiAction.php` | `Present` | `frontend/src/features/staff/permissions/api.ts`<br>`backend/internal/presentation/httpapi/staff_permissions.go` | Permissions API. |
| `app/Http/Controllers/Staff/Permissions/EditAction.php` | `Present` | `frontend/src/pages/staff/permissions/[userId].vue` | Detail page. |
| `app/Http/Controllers/Staff/Permissions/IndexAction.php` | `Present` | `frontend/src/pages/staff/permissions/index.vue`<br>`frontend/src/features/staff/permissions/api.ts`<br>`backend/internal/presentation/httpapi/staff_permissions.go` | List page. |
| `app/Http/Controllers/Staff/Permissions/UpdateAction.php` | `Present` | `frontend/src/features/staff/permissions/api.ts`<br>`backend/internal/presentation/httpapi/staff_permissions.go` | Update API. |
| `app/Http/Controllers/Staff/Circles/AllAction.php` | `Present` | `frontend/src/features/staff/circles/api.ts`<br>`backend/internal/presentation/httpapi/staff_circles.go` | All-list API. |
| `app/Http/Controllers/Staff/Circles/ApiAction.php` | `Present` | `frontend/src/features/staff/circles/api.ts`<br>`backend/internal/presentation/httpapi/staff_circles.go` | Circles API. |
| `app/Http/Controllers/Staff/Circles/CreateAction.php` | `Partial` | `frontend/src/pages/staff/circles/index.vue` | Reworked to create within the list page instead of using a dedicated create page. |
| `app/Http/Controllers/Staff/Circles/DestroyAction.php` | `Present` | `frontend/src/features/staff/circles/api.ts`<br>`backend/internal/presentation/httpapi/staff_circles.go` | Delete API. |
| `app/Http/Controllers/Staff/Circles/EditAction.php` | `Present` | `frontend/src/pages/staff/circles/[circleId].vue` | Detail/edit page. |
| `app/Http/Controllers/Staff/Circles/ExportAction.php` | `Present` | `frontend/src/pages/staff/circles/index.vue`<br>`backend/internal/presentation/httpapi/staff_circles.go` | CSV export. |
| `app/Http/Controllers/Staff/Circles/IndexAction.php` | `Present` | `frontend/src/pages/staff/circles/index.vue`<br>`frontend/src/features/staff/circles/api.ts`<br>`backend/internal/presentation/httpapi/staff_circles.go` | List page. |
| `app/Http/Controllers/Staff/Circles/StoreAction.php` | `Present` | `frontend/src/features/staff/circles/api.ts`<br>`backend/internal/presentation/httpapi/staff_circles.go` | Create API. |
| `app/Http/Controllers/Staff/Circles/UpdateAction.php` | `Present` | `frontend/src/features/staff/circles/api.ts`<br>`backend/internal/presentation/httpapi/staff_circles.go` | Update API. |
| `app/Http/Controllers/Staff/Circles/SendEmails/IndexAction.php` | `Partial` | `frontend/src/pages/staff/circles/[circleId].vue`<br>`frontend/src/features/staff/circles/api.ts` | Integrated into mail section within circle detail. |
| `app/Http/Controllers/Staff/Circles/SendEmails/SendAction.php` | `Partial` | `frontend/src/features/staff/circles/api.ts`<br>`backend/internal/presentation/httpapi/staff_circles.go` | The main body is sent, but the copy email for staff has not been migrated. |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/ApiAction.php` | `Present` | `frontend/src/features/staff/participation-types/api.ts`<br>`backend/internal/presentation/httpapi/staff_participation_types.go` | Participation types API. |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/CreateAction.php` | `Partial` | `frontend/src/pages/staff/participation-types/index.vue` | Reworked to create within the list page instead of using a dedicated create page. |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/DestroyAction.php` | `Present` | `frontend/src/features/staff/participation-types/api.ts`<br>`backend/internal/presentation/httpapi/staff_participation_types.go` | Delete API. |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/EditAction.php` | `Present` | `frontend/src/pages/staff/participation-types/[typeId].vue` | Detail/edit page. |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/ExportAction.php` | `Present` | `frontend/src/pages/staff/participation-types/[typeId].vue`<br>`backend/internal/presentation/httpapi/staff_participation_types.go` | CSV export. |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/IndexAction.php` | `Present` | `frontend/src/pages/staff/participation-types/[typeId].vue`<br>`frontend/src/features/staff/participation-types/api.ts` | Type detail + circles list. |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/StoreAction.php` | `Present` | `frontend/src/features/staff/participation-types/api.ts`<br>`backend/internal/presentation/httpapi/staff_participation_types.go` | Create API. |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/UpdateAction.php` | `Present` | `frontend/src/features/staff/participation-types/api.ts`<br>`backend/internal/presentation/httpapi/staff_participation_types.go` | Update API. |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/Form/EditAction.php` | `Partial` | `frontend/src/pages/staff/participation-types/[typeId].vue` | Form settings are integrated into participation type details. |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/Form/EditorAction.php` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | Integrated into generic form editor instead of dedicated editor. |
| `app/Http/Controllers/Staff/Circles/ParticipationTypes/Form/UpdateAction.php` | `Present` | `frontend/src/features/staff/participation-types/api.ts`<br>`backend/internal/presentation/httpapi/staff_participation_types.go` | form settings updated. |
| `app/Http/Controllers/Staff/Tags/ApiAction.php` | `Present` | `frontend/src/features/staff/masters/tags.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | Tags API. |
| `app/Http/Controllers/Staff/Tags/CreateAction.php` | `Partial` | `frontend/src/pages/staff/tags.vue` | Reworked to inline create within the list page. |
| `app/Http/Controllers/Staff/Tags/DeleteAction.php` | `Partial` | `frontend/src/pages/staff/tags.vue` | The dedicated confirmation page was removed. |
| `app/Http/Controllers/Staff/Tags/DestroyAction.php` | `Present` | `frontend/src/features/staff/masters/tags.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | Delete API. |
| `app/Http/Controllers/Staff/Tags/EditAction.php` | `Partial` | `frontend/src/pages/staff/tags.vue` | Reworked to inline edit within the list page. |
| `app/Http/Controllers/Staff/Tags/ExportAction.php` | `Present` | `frontend/src/pages/staff/tags.vue`<br>`backend/internal/presentation/httpapi/staff_masters.go` | CSV export. |
| `app/Http/Controllers/Staff/Tags/IndexAction.php` | `Present` | `frontend/src/pages/staff/tags.vue`<br>`frontend/src/features/staff/masters/tags.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | List page. |
| `app/Http/Controllers/Staff/Tags/StoreAction.php` | `Present` | `frontend/src/features/staff/masters/tags.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | Create API. |
| `app/Http/Controllers/Staff/Tags/UpdateAction.php` | `Present` | `frontend/src/features/staff/masters/tags.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | Update API. |
| `app/Http/Controllers/Staff/Places/ApiAction.php` | `Present` | `frontend/src/features/staff/masters/places.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | Places API. |
| `app/Http/Controllers/Staff/Places/CreateAction.php` | `Partial` | `frontend/src/pages/staff/places.vue` | Reworked to inline create within the list page. |
| `app/Http/Controllers/Staff/Places/DestroyAction.php` | `Present` | `frontend/src/features/staff/masters/places.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | Delete API. |
| `app/Http/Controllers/Staff/Places/EditAction.php` | `Partial` | `frontend/src/pages/staff/places.vue` | Reworked to inline edit within the list page. |
| `app/Http/Controllers/Staff/Places/ExportAction.php` | `Present` | `frontend/src/pages/staff/places.vue`<br>`backend/internal/presentation/httpapi/staff_masters.go` | CSV export. |
| `app/Http/Controllers/Staff/Places/IndexAction.php` | `Present` | `frontend/src/pages/staff/places.vue`<br>`frontend/src/features/staff/masters/places.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | List page. |
| `app/Http/Controllers/Staff/Places/StoreAction.php` | `Present` | `frontend/src/features/staff/masters/places.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | Create API. |
| `app/Http/Controllers/Staff/Places/UpdateAction.php` | `Present` | `frontend/src/features/staff/masters/places.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | Update API. |
| `app/Http/Controllers/Staff/SendEmails/DestroyAction.php` | `Missing` | - | The queue delete/cancel API is not in the new implementation. |
| `app/Http/Controllers/Staff/SendEmails/IndexAction.php` | `Partial` | `frontend/src/pages/staff/mails.vue`<br>`frontend/src/features/staff/admin/mails.ts`<br>`backend/internal/presentation/httpapi/staff_mails.go` | Replaced with generic mail queue. |
| `app/Http/Controllers/Staff/Contacts/Categories/CreateAction.php` | `Partial` | `frontend/src/pages/staff/contact-categories.vue` | Reworked to inline create within the list page. |
| `app/Http/Controllers/Staff/Contacts/Categories/DeleteAction.php` | `Partial` | `frontend/src/pages/staff/contact-categories.vue` | The dedicated confirmation page was removed. |
| `app/Http/Controllers/Staff/Contacts/Categories/DestroyAction.php` | `Present` | `frontend/src/features/staff/masters/contactCategories.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | Delete API. |
| `app/Http/Controllers/Staff/Contacts/Categories/EditAction.php` | `Partial` | `frontend/src/pages/staff/contact-categories.vue` | Reworked to inline edit within the list page. |
| `app/Http/Controllers/Staff/Contacts/Categories/IndexAction.php` | `Present` | `frontend/src/pages/staff/contact-categories.vue`<br>`frontend/src/features/staff/masters/contactCategories.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | List page. |
| `app/Http/Controllers/Staff/Contacts/Categories/StoreAction.php` | `Present` | `frontend/src/features/staff/masters/contactCategories.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | Create API. |
| `app/Http/Controllers/Staff/Contacts/Categories/UpdateAction.php` | `Present` | `frontend/src/features/staff/masters/contactCategories.ts`<br>`backend/internal/presentation/httpapi/staff_masters.go` | Update API. |
| `app/Http/Controllers/Staff/Documents/ApiAction.php` | `Present` | `frontend/src/features/staff/documents/api.ts`<br>`backend/internal/presentation/httpapi/staff_documents.go` | Documents API. |
| `app/Http/Controllers/Staff/Documents/CreateAction.php` | `Partial` | `frontend/src/pages/staff/documents/index.vue` | Reworked to create within the list page. |
| `app/Http/Controllers/Staff/Documents/DestroyAction.php` | `Present` | `frontend/src/features/staff/documents/api.ts`<br>`backend/internal/presentation/httpapi/staff_documents.go` | Delete API. |
| `app/Http/Controllers/Staff/Documents/EditAction.php` | `Present` | `frontend/src/pages/staff/documents/[documentId]/edit.vue` | Edit page. |
| `app/Http/Controllers/Staff/Documents/ExportAction.php` | `Present` | `frontend/src/pages/staff/documents/index.vue`<br>`backend/internal/presentation/httpapi/staff_documents.go` | CSV export. |
| `app/Http/Controllers/Staff/Documents/IndexAction.php` | `Present` | `frontend/src/pages/staff/documents/index.vue`<br>`frontend/src/features/staff/documents/api.ts`<br>`backend/internal/presentation/httpapi/staff_documents.go` | List page. |
| `app/Http/Controllers/Staff/Documents/ShowAction.php` | `Present` | `frontend/src/features/staff/documents/api.ts`<br>`backend/internal/presentation/httpapi/staff_documents.go` | File download. |
| `app/Http/Controllers/Staff/Documents/StoreAction.php` | `Present` | `frontend/src/features/staff/documents/api.ts`<br>`backend/internal/presentation/httpapi/staff_documents.go` | Create API. |
| `app/Http/Controllers/Staff/Documents/UpdateAction.php` | `Present` | `frontend/src/features/staff/documents/api.ts`<br>`backend/internal/presentation/httpapi/staff_documents.go` | Update API. |
| `app/Http/Controllers/Admin/ActivityLog/ApiAction.php` | `Present` | `frontend/src/features/staff/admin/activityLogs.ts`<br>`backend/internal/presentation/httpapi/staff_activity_logs.go` | Activity logs API. |
| `app/Http/Controllers/Admin/ActivityLog/IndexAction.php` | `Present` | `frontend/src/pages/staff/activity-logs.vue`<br>`frontend/src/features/staff/admin/activityLogs.ts`<br>`backend/internal/presentation/httpapi/staff_activity_logs.go` | Moved to `/staff/activity-logs`. |
| `app/Http/Controllers/Admin/Portal/EditAction.php` | `Present` | `frontend/src/pages/staff/settings/portal.vue`<br>`frontend/src/features/staff/admin/portalSettings.ts` | Moved to `/staff/settings/portal`. |
| `app/Http/Controllers/Admin/Portal/UpdateAction.php` | `Present` | `frontend/src/features/staff/admin/portalSettings.ts`<br>`backend/internal/presentation/httpapi/staff_portal_settings.go` | portal settings update API. |
| `app/Http/Controllers/Pages/IndexAction.php` | `Present` | `frontend/src/pages/workspace/pages/index.vue`<br>`frontend/src/features/pages/api.ts`<br>`backend/internal/presentation/httpapi/pages.go` | List of pages for participants. |
| `app/Http/Controllers/Pages/ShowAction.php` | `Present` | `frontend/src/pages/workspace/pages/[pageId].vue`<br>`frontend/src/features/pages/api.ts`<br>`backend/internal/presentation/httpapi/pages.go` | For participants page details. |
| `app/Http/Controllers/Circles/Auth/PostAction.php` | `Missing` | - | Circle auth dedicated flow cannot be confirmed. |
| `app/Http/Controllers/Circles/Auth/ShowAction.php` | `Missing` | - | No direct counterpart for the circle-auth-specific page could be confirmed. |
| `app/Http/Controllers/Circles/ConfirmAction.php` | `Partial` | `frontend/src/pages/workspace/circles/detail.vue`<br>`backend/internal/presentation/httpapi/circles.go` | Reorganized to flow in detail instead of route only for confirmation screen. |
| `app/Http/Controllers/Circles/CreateAction.php` | `Present` | `frontend/src/pages/circles/new.vue`<br>`backend/internal/presentation/httpapi/circles.go` | Planning screen. |
| `app/Http/Controllers/Circles/DeleteAction.php` | `Partial` | `frontend/src/pages/workspace/circles/detail.vue`<br>`backend/internal/presentation/httpapi/circles.go` | The deletion confirmation page is integrated into detail. |
| `app/Http/Controllers/Circles/DestroyAction.php` | `Partial` | `backend/internal/presentation/httpapi/circles.go` | There is a deletion API, but the UI is operated from detail. |
| `app/Http/Controllers/Circles/DoneAction.php` | `Missing` | - | No direct counterpart for the legacy completion-page route could be confirmed. |
| `app/Http/Controllers/Circles/EditAction.php` | `Partial` | `frontend/src/pages/workspace/circles/detail.vue`<br>`backend/internal/presentation/httpapi/circles.go` | Planning and editing has been reorganized into workspace detail. |
| `app/Http/Controllers/Circles/Selector/SetAction.php` | `Partial` | `frontend/src/pages/circles/select.vue`<br>`backend/internal/presentation/httpapi/session_bootstrap.go` | Reorganized to selected circle update. |
| `app/Http/Controllers/Circles/Selector/ShowAction.php` | `Partial` | `frontend/src/pages/circles/select.vue`<br>`frontend/src/app/router/circleSelectorRedirect.ts`<br>`backend/internal/presentation/httpapi/session_bootstrap.go` | The selector screen was migrated to Vue, and the Blade-based structure was removed. |
| `app/Http/Controllers/Circles/ShowAction.php` | `Partial` | `frontend/src/pages/workspace/circles/detail.vue`<br>`backend/internal/presentation/httpapi/circles.go` | Project details have been reorganized to the workspace screen. |
| `app/Http/Controllers/Circles/StoreAction.php` | `Present` | `frontend/src/pages/circles/new.vue`<br>`backend/internal/presentation/httpapi/circles.go` | Planning creation API. |
| `app/Http/Controllers/Circles/SubmitAction.php` | `Partial` | `frontend/src/pages/workspace/circles/detail.vue`<br>`backend/internal/presentation/httpapi/circles.go` | Although the submission itself has been migrated, the route configuration has been reorganized. |
| `app/Http/Controllers/Circles/UpdateAction.php` | `Partial` | `frontend/src/pages/workspace/circles/detail.vue`<br>`backend/internal/presentation/httpapi/circles.go` | There is an update API, but the route configuration has been reorganized. |
| `app/Http/Controllers/Circles/Users/DestroyAction.php` | `Partial` | `frontend/src/pages/workspace/circles/members.vue`<br>`backend/internal/presentation/httpapi/circles.go` | Member deletion is integrated into the workspace side. |
| `app/Http/Controllers/Circles/Users/IndexAction.php` | `Partial` | `frontend/src/pages/workspace/circles/members.vue`<br>`backend/internal/presentation/httpapi/circles.go` | The UI is integrated into the members screen on the workspace side. |
| `app/Http/Controllers/Circles/Users/InviteAction.php` | `Partial` | `frontend/src/pages/workspace/circles/members.vue`<br>`frontend/src/pages/circles/join/[token].vue`<br>`backend/internal/presentation/httpapi/circles.go` | Invitation display/participation has been reorganized to the members + join screen. |
| `app/Http/Controllers/Circles/Users/RegenerateTokenAction.php` | `Partial` | `frontend/src/pages/workspace/circles/members.vue`<br>`backend/internal/presentation/httpapi/circles.go` | Invitation token regeneration is integrated into the members screen. |
| `app/Http/Controllers/Circles/Users/StoreAction.php` | `Partial` | `frontend/src/pages/workspace/circles/members.vue`<br>`backend/internal/presentation/httpapi/circles.go` | Adding members is integrated into the workspace side. |
| `app/Http/Controllers/Contacts/CreateAction.php` | `Present` | `frontend/src/pages/workspace/contact.vue`<br>`frontend/src/features/contact/api.ts`<br>`backend/internal/presentation/httpapi/contact_profile.go` | Contact page. |
| `app/Http/Controllers/Contacts/PostAction.php` | `Present` | `frontend/src/features/contact/api.ts`<br>`backend/internal/presentation/httpapi/contact_profile.go` | Inquiry submission API. |
| `app/Http/Controllers/Documents/IndexAction.php` | `Present` | `frontend/src/pages/workspace/documents/index.vue`<br>`frontend/src/features/documents/api.ts`<br>`backend/internal/presentation/httpapi/documents.go` | Document list for participants. |
| `app/Http/Controllers/Documents/ShowAction.php` | `Present` | `frontend/src/features/documents/api.ts`<br>`backend/internal/presentation/httpapi/documents.go` | Get document for participant. |
| `app/Http/Controllers/Forms/AllAction.php` | `Partial` | `frontend/src/pages/workspace/forms/index.vue`<br>`frontend/src/features/forms/api.ts`<br>`backend/internal/presentation/httpapi/forms.go` | Integrated into public form list. |
| `app/Http/Controllers/Forms/ClosedAction.php` | `Partial` | `frontend/src/pages/workspace/forms/index.vue`<br>`frontend/src/features/forms/api.ts`<br>`backend/internal/presentation/httpapi/forms.go` | Closed dedicated route has been reorganized into a list filter/status display. |
| `app/Http/Controllers/Forms/IndexAction.php` | `Present` | `frontend/src/pages/workspace/forms/index.vue`<br>`frontend/src/features/forms/api.ts`<br>`backend/internal/presentation/httpapi/forms.go` | List of public forms. |
| `app/Http/Controllers/Forms/Answers/CreateAction.php` | `Present` | `frontend/src/pages/workspace/forms/[formId].vue`<br>`frontend/src/features/forms/answers.ts`<br>`backend/internal/presentation/httpapi/form_answers.go` | Participant answer creation screen. |
| `app/Http/Controllers/Forms/Answers/EditAction.php` | `Present` | `frontend/src/pages/workspace/forms/[formId].vue`<br>`frontend/src/features/forms/answers.ts`<br>`backend/internal/presentation/httpapi/form_answers.go` | Participant answer editing screen. |
| `app/Http/Controllers/Forms/Answers/StoreAction.php` | `Present` | `frontend/src/features/forms/answers.ts`<br>`backend/internal/presentation/httpapi/form_answers.go` | participant answer API. |
| `app/Http/Controllers/Forms/Answers/UpdateAction.php` | `Present` | `frontend/src/features/forms/answers.ts`<br>`backend/internal/presentation/httpapi/form_answers.go` | participant answer API. |
| `app/Http/Controllers/Forms/Answers/Uploads/ShowAction.php` | `Present` | `frontend/src/features/forms/answers.ts`<br>`backend/internal/presentation/httpapi/form_answers.go` | participant attached download. |
| `app/Http/Controllers/Auth/LoginController.php` | `Present` | `frontend/src/pages/login.vue`<br>`frontend/src/features/auth/api.ts`<br>`backend/internal/presentation/httpapi/auth.go` | Login/logout is migrated. |
| `app/Http/Controllers/Auth/RegisterController.php` | `Partial` | `frontend/src/pages/register.vue` | There is a registration screen, but the registration backend has not been migrated. |
| `app/Http/Controllers/Auth/Password/PostResetPasswordAction.php` | `Partial` | `frontend/src/pages/password/reset/[userId].vue` | There is a reset completion screen, but the backend has not been migrated. |
| `app/Http/Controllers/Auth/Password/PostResetStartAction.php` | `Partial` | `frontend/src/pages/password/reset.vue` | There is a reset start screen, but the backend has not been migrated. |
| `app/Http/Controllers/Auth/Password/ResetPasswordAction.php` | `Partial` | `frontend/src/pages/password/reset/[userId].vue` | There is a reset completion screen, but the backend has not been migrated. |
| `app/Http/Controllers/Auth/Password/ResetStartAction.php` | `Partial` | `frontend/src/pages/password/reset.vue` | There is a reset start screen, but the backend has not been migrated. |
| `app/Http/Controllers/Auth/Email/CompletedAction.php` | `Partial` | `frontend/src/pages/email/verify/completed.vue` | There is a verify completion screen, but the backend has not been migrated. |
| `app/Http/Controllers/Auth/Email/ResendAction.php` | `Partial` | `frontend/src/pages/email/verify/[type]/[userId].vue` | There is a verify/resend UI, but the backend has not been migrated. |
| `app/Http/Controllers/Auth/Email/VerifyAction.php` | `Partial` | `frontend/src/pages/email/verify/[type]/[userId].vue` | There is a verify/resend UI, but the backend has not been migrated. |
| `app/Http/Controllers/Auth/Email/VerifyNoticeAction.php` | `Partial` | `frontend/src/pages/email/verify.vue` | There is a verify information screen, but the backend has not been migrated. |
| `app/Http/Controllers/Users/ChangePasswordAction.php` | `Present` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/password.ts` | Password change page. |
| `app/Http/Controllers/Users/DeleteAction.php` | `Partial` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/deleteAccount.ts` | Integrated into the flow within settings instead of a page dedicated to deletion confirmation. |
| `app/Http/Controllers/Users/DestroyAction.php` | `Present` | `frontend/src/features/session/deleteAccount.ts`<br>`backend/internal/presentation/httpapi/contact_profile.go` | Self account deletion API. |
| `app/Http/Controllers/Users/EditAppearanceAction.php` | `Present` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/theme.ts` | Appearance settings page. |
| `app/Http/Controllers/Users/EditInfoAction.php` | `Present` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/profile.ts` | Profile edit page. |
| `app/Http/Controllers/Users/PostChangePasswordAction.php` | `Present` | `frontend/src/features/session/password.ts`<br>`backend/internal/presentation/httpapi/contact_profile.go` | Password change API. |
| `app/Http/Controllers/Users/UpdateAppearanceAction.php` | `Present` | `frontend/src/features/session/theme.ts` | Updated appearance settings. |
| `app/Http/Controllers/Users/UpdateInfoAction.php` | `Present` | `frontend/src/features/session/profile.ts`<br>`backend/internal/presentation/httpapi/contact_profile.go` | Profile update API. |
| `app/Http/Controllers/Install/Admin/CreateAction.php` | `Missing` | - | The install flow itself has not yet been migrated. |
| `app/Http/Controllers/Install/Admin/StoreAction.php` | `Missing` | - | The install flow itself has not yet been migrated. |
| `app/Http/Controllers/Install/Database/EditAction.php` | `Missing` | - | The install flow itself has not yet been migrated. |
| `app/Http/Controllers/Install/Database/UpdateAction.php` | `Missing` | - | The install flow itself has not yet been migrated. |
| `app/Http/Controllers/Install/HomeAction.php` | `Missing` | - | The install flow itself has not yet been migrated. |
| `app/Http/Controllers/Install/Mail/EditAction.php` | `Missing` | - | The install flow itself has not yet been migrated. |
| `app/Http/Controllers/Install/Mail/SendTestAction.php` | `Missing` | - | The install flow itself has not yet been migrated. |
| `app/Http/Controllers/Install/Mail/UpdateAction.php` | `Missing` | - | The install flow itself has not yet been migrated. |
| `app/Http/Controllers/Install/Portal/EditAction.php` | `Missing` | - | The install flow itself has not yet been migrated. |
| `app/Http/Controllers/Install/Portal/UpdateAction.php` | `Missing` | - | The install flow itself has not yet been migrated. |


## app/Services

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Services/Auth/EmailService.php` | `Missing` | - | Unable to confirm new implementation of email verification URL issuance/send. |
| `app/Services/Auth/RegisterService.php` | `Missing` | - | There is no new registration API. |
| `app/Services/Auth/ResetPasswordService.php` | `Missing` | - | There is no password reset start/complete API. |
| `app/Services/Auth/StaffAuthService.php` | `Partial` | `backend/internal/presentation/httpapi/staff_verify.go`<br>`frontend/src/features/staff/status/api.ts` | There is a staff authentication flow, but mock verify code instead of email notifications. |
| `app/Services/Auth/VerifyService.php` | `Partial` | `backend/internal/presentation/httpapi/staff_users.go`<br>`frontend/src/features/staff/users/api.ts` | There is an `isVerified` update, but it is not a two-way verification of email/univemail. |
| `app/Services/Circles/CirclesService.php` | `Partial` | `backend/internal/presentation/httpapi/circles.go`<br>`backend/internal/presentation/httpapi/staff_circles.go`<br>`backend/internal/domain/circle/catalog.go` | Planning CRUD/Submission/Member/Invitation has been migrated. Approval/rejection mail is unconfirmed. |
| `app/Services/Circles/SelectorService.php` | `Present` | `backend/internal/presentation/httpapi/circles.go`<br>`backend/internal/presentation/httpapi/session_bootstrap.go` | current circle Replaced with select/hold. |
| `app/Services/Contacts/ContactCategoriesService.php` | `Partial` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`backend/internal/presentation/httpapi/staff_masters.go` | There is category reference/CRUD, but there is no dedicated test send service for categories. |
| `app/Services/Contacts/ContactsService.php` | `Present` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`backend/internal/domain/mailqueue/repository.go`<br>`frontend/src/features/contact/api.ts` | Inquiry registration/history/email submission has been migrated. |
| `app/Services/Documents/DocumentsService.php` | `Present` | `backend/internal/presentation/httpapi/staff_documents.go`<br>`backend/internal/domain/document/repository.go`<br>`frontend/src/features/staff/documents/api.ts` | Replaced with handout CRUD/Download. |
| `app/Services/Emails/SendEmailService.php` | `Partial` | `backend/internal/presentation/httpapi/staff_mails.go`<br>`backend/internal/domain/mailqueue/repository.go`<br>`backend/internal/app/worker/mailer.go` | General-purpose sending service has been reorganized into mail queue + worker. |
| `app/Services/Forms/AnswerDetailsService.php` | `Present` | `backend/internal/presentation/httpapi/form_answers.go`<br>`backend/internal/presentation/httpapi/staff_form_answers.go`<br>`backend/internal/domain/answer/repository.go` | Replaced with details/upload processing. |
| `app/Services/Forms/AnswersService.php` | `Partial` | `backend/internal/presentation/httpapi/form_answers.go`<br>`backend/internal/presentation/httpapi/staff_form_answers.go`<br>`frontend/src/features/forms/answers.ts` | Answer: CRUD exists. Confirmation emails are not completely 1:1. |
| `app/Services/Forms/DownloadZipService.php` | `Present` | `backend/internal/presentation/httpapi/staff_form_answers.go` | Replaced with attached ZIP output. |
| `app/Services/Forms/Exceptions/NoDownloadFileExistException.php` | `Partial` | `backend/internal/presentation/httpapi/staff_form_answers.go` | There is a function, but there is no dedicated exception type. |
| `app/Services/Forms/Exceptions/ZipArchiveNotSupportedException.php` | `Partial` | `backend/internal/presentation/httpapi/staff_form_answers.go` | There is ZIP generation, but no dedicated exception type. |
| `app/Services/Forms/FormEditorService.php` | `Present` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`frontend/src/features/staff/forms/api.ts` | Replaced with form update. |
| `app/Services/Forms/FormsService.php` | `Present` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`backend/internal/domain/form/repository.go`<br>`frontend/src/features/staff/forms/api.ts` | There is create/update/delete/copy. |
| `app/Services/Forms/QuestionsService.php` | `Present` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`backend/internal/domain/formquestion/repository.go`<br>`frontend/src/features/staff/forms/api.ts` | Question There is CRUD/sorting. |
| `app/Services/Forms/ValidationRulesService.php` | `Present` | `backend/internal/presentation/httpapi/form_answers.go`<br>`backend/internal/presentation/httpapi/staff_forms.go` | Reimplemented as dynamic question validation. |
| `app/Services/Install/AbstractService.php` | `Missing` | - | The install mechanism itself is not in the target. |
| `app/Services/Install/DatabaseService.php` | `Missing` | - | Install DB connection checks have not yet been migrated. |
| `app/Services/Install/MailService.php` | `Missing` | - | Install mail settings and test-send flow have not yet been migrated. |
| `app/Services/Install/PortalService.php` | `Missing` | - | Install portal-setting input flow has not yet been migrated. |
| `app/Services/Install/RunInstallService.php` | `Missing` | - | `.env` Update/Artisan execution equivalent not available. |
| `app/Services/Pages/PagesService.php` | `Present` | `backend/internal/presentation/httpapi/staff_pages.go`<br>`backend/internal/domain/page/repository.go`<br>`frontend/src/features/staff/pages/api.ts` | Page CRUD/pin/outgoing email input included. |
| `app/Services/Pages/ReadsService.php` | `Missing` | - | Read count/read mark function has not been migrated. |
| `app/Services/ParticipationTypes/ParticipationTypesService.php` | `Present` | `backend/internal/presentation/httpapi/staff_participation_types.go`<br>`backend/internal/domain/participationtype/repository.go`<br>`frontend/src/features/staff/participation-types/api.ts` | Replaced with participation type management. |
| `app/Services/Tags/Exceptions/DenyCreateTagsException.php` | `Missing` | - | There is no dedicated exception for rejecting automatic tag generation. |
| `app/Services/Tags/TagsService.php` | `Partial` | `backend/internal/presentation/httpapi/staff_masters.go`<br>`backend/internal/domain/tag/repository.go`<br>`frontend/src/features/staff/masters/tags.ts` | There is a tag CRUD, but there is no `getOrCreateTags` auxiliary service. |
| `app/Services/Users/ChangePasswordService.php` | `Present` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`backend/internal/domain/auth/static.go`<br>`frontend/src/features/session/password.ts` | Replaced with password change. |
| `app/Services/Utils/ActivityLogService.php` | `Present` | `backend/internal/presentation/httpapi/staff_activity_logs.go`<br>`backend/internal/domain/activitylog/repository.go`<br>`frontend/src/features/staff/admin/activityLogs.ts` | Replaced with activity record/list. |
| `app/Services/Utils/DotenvService.php` | `Partial` | `backend/internal/presentation/httpapi/staff_portal_settings.go`<br>`backend/internal/domain/portalsetting/repository.go` | There is a portal configuration update, but not `.env` editing. |
| `app/Services/Utils/FormatTextService.php` | `Partial` | `backend/internal/presentation/httpapi/staff_exports.go` | Some of the formatting at the time of output is inline. |
| `app/Services/Utils/ParseMarkdownService.php` | `Missing` | - | Unable to check markdown conversion service. |
| `app/Services/Utils/ReleaseInfoService.php` | `Missing` | - | release No information acquisition function. |
| `app/Services/Utils/UIThemeService.php` | `Present` | `frontend/src/features/session/theme.ts` | Theme cookie management moved to frontend side. |
| `app/Services/Utils/ValueObjects/Release.php` | `Missing` | - | No release expression value object. |
| `app/Services/Utils/ValueObjects/Version.php` | `Missing` | - | version value object None. |

## app/Eloquents

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Eloquents/Answer.php` | `Present` | `backend/internal/domain/answer/repository.go` | Compatible with core answer model. |
| `app/Eloquents/AnswerDetail.php` | `Partial` | `backend/internal/domain/answer/repository.go` | detail is integrated into `Answer.Details` instead of an independent model. |
| `app/Eloquents/Booth.php` | `Present` | `backend/internal/domain/booth/repository.go` | Support for place-circle assignment. |
| `app/Eloquents/Circle.php` | `Present` | `backend/internal/domain/circle/catalog.go` | Supports planning aggregate. |
| `app/Eloquents/CircleTag.php` | `Partial` | `backend/internal/domain/circle/catalog.go` | pivot is absorbed into `Circle.Tags`. |
| `app/Eloquents/CircleUser.php` | `Partial` | `backend/internal/domain/circle/catalog.go` | pivot is absorbed into `CircleMember`. |
| `app/Eloquents/Concerns/IsNewTrait.php` | `Partial` | `backend/internal/presentation/httpapi/documents.go` | `isNew` is an inline calculation. There are no traits. |
| `app/Eloquents/ContactCategory.php` | `Present` | `backend/internal/domain/contactcategory/repository.go` | Implemented. |
| `app/Eloquents/Document.php` | `Present` | `backend/internal/domain/document/repository.go` | Implemented. |
| `app/Eloquents/Email.php` | `Partial` | `backend/internal/domain/mailqueue/repository.go` | Replaced with mail queue job. |
| `app/Eloquents/Form.php` | `Present` | `backend/internal/domain/form/repository.go` | Implemented. |
| `app/Eloquents/FormAnswerableTag.php` | `Partial` | `backend/internal/domain/form/repository.go` | pivot is absorbed into `Form.AnswerableTags`. |
| `app/Eloquents/Page.php` | `Present` | `backend/internal/domain/page/repository.go` | Implemented. |
| `app/Eloquents/PageViewableTag.php` | `Partial` | `backend/internal/domain/page/repository.go` | pivot is absorbed into `Page.ViewableTags`. |
| `app/Eloquents/ParticipationType.php` | `Present` | `backend/internal/domain/participationtype/repository.go` | Implemented. |
| `app/Eloquents/Permission.php` | `Partial` | `backend/internal/domain/staffpermission/definitions.go`<br>`backend/internal/presentation/httpapi/staff_permissions.go` | Replaced with definition set + user grant authority instead of DB model. |
| `app/Eloquents/Place.php` | `Present` | `backend/internal/domain/place/repository.go` | Implemented. |
| `app/Eloquents/Question.php` | `Present` | `backend/internal/domain/formquestion/repository.go` | Implemented. |
| `app/Eloquents/Read.php` | `Missing` | - | Read pivot Not migrated. |
| `app/Eloquents/Tag.php` | `Present` | `backend/internal/domain/tag/repository.go` | Implemented. |
| `app/Eloquents/User.php` | `Partial` | `backend/internal/domain/auth/`<br>`backend/internal/domain/useradmin/`<br>`backend/internal/domain/session/` | The user expression is divided into multiple domains. Email/univemail specific attributes are not supported. |
| `app/Eloquents/ValueObjects/PermissionInfo.php` | `Partial` | `backend/internal/domain/staffpermission/definitions.go` | Replaced with permission metadata definition. |

## app/Policies

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Policies/AnswerPolicy.php` | `Partial` | `backend/internal/presentation/httpapi/form_answers.go`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | Judgment is included in handler/domain. |
| `app/Policies/Circle/BelongsPolicy.php` | `Partial` | `backend/internal/domain/circle/catalog.go`<br>`backend/internal/presentation/httpapi/circles.go` | Affiliation determination is included in the circle catalog. |
| `app/Policies/Circle/CreatePolicy.php` | `Partial` | `backend/internal/presentation/httpapi/circles.go` | Whether or not a plan can be created is determined by the handler. |
| `app/Policies/Circle/UpdateGroupNamePolicy.php` | `Partial` | `backend/internal/presentation/httpapi/circles.go` | Integrated into update handler side instead of dedicated policy. |
| `app/Policies/Circle/UpdatePolicy.php` | `Partial` | `backend/internal/domain/circle/catalog.go`<br>`backend/internal/presentation/httpapi/circles.go` | Updateability is integrated into catalog/handler. |
| `app/Policies/FormPolicy.php` | `Partial` | `backend/internal/domain/form/repository.go`<br>`backend/internal/presentation/httpapi/forms.go` | View judgment is integrated into form/circle condition. |
| `app/Policies/PagePolicy.php` | `Partial` | `backend/internal/domain/page/repository.go`<br>`backend/internal/presentation/httpapi/pages.go` | View judgment is integrated into page repository/handler. |

## app/Http/Requests

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Http/Requests/Admin/Permissions/PermissionRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_permissions.go`<br>`frontend/src/features/staff/permissions/api.ts` | Validation is moved to handler side. |
| `app/Http/Requests/Auth/Password/ResetPasswordRequest.php` | `Missing` | - | No supported API. |
| `app/Http/Requests/Auth/Password/ResetStartRequest.php` | `Missing` | - | No supported API. |
| `app/Http/Requests/Auth/RegisterRequest.php` | `Missing` | - | No supported API. |
| `app/Http/Requests/Circles/AuthRequest.php` | `Missing` | - | Circle auth equivalent function cannot be confirmed. |
| `app/Http/Requests/Circles/CircleRequest.php` | `Partial` | `backend/internal/presentation/httpapi/circles.go`<br>`backend/internal/presentation/httpapi/form_answers.go` | Planning creation and participation form responses have been separated. |
| `app/Http/Requests/Circles/SendEmailsRequest.php` | `Partial` | `backend/internal/presentation/httpapi/staff_circles.go`<br>`frontend/src/features/staff/circles/api.ts` | The mail destination has been relocated to the staff function. |
| `app/Http/Requests/Circles/SubmitRequest.php` | `Partial` | `backend/internal/presentation/httpapi/circles.go` | Although there is a submission itself, the answer-related responsibilities are separated into the form API. |
| `app/Http/Requests/ContactFormRequest.php` | `Present` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`frontend/src/features/contact/api.ts` | Inquiry submission validation available. |
| `app/Http/Requests/Forms/AnswerRequestInterface.php` | `Partial` | `backend/internal/presentation/httpapi/form_answers.go` | There is no interface and it is handled directly by handler. |
| `app/Http/Requests/Forms/BaseAnswerRequest.php` | `Present` | `backend/internal/presentation/httpapi/form_answers.go`<br>`frontend/src/features/forms/answers.ts` | Reimplemented as common answer validation. |
| `app/Http/Requests/Forms/StoreAnswerRequest.php` | `Present` | `backend/internal/presentation/httpapi/form_answers.go` | Compatible with creation systems. |
| `app/Http/Requests/Forms/UpdateAnswerRequest.php` | `Present` | `backend/internal/presentation/httpapi/form_answers.go` | Compatible with update system. |
| `app/Http/Requests/Install/AdminRequest.php` | `Missing` | - | Install has not yet been migrated. |
| `app/Http/Requests/Install/DatabaseRequest.php` | `Missing` | - | Install has not yet been migrated. |
| `app/Http/Requests/Install/MailRequest.php` | `Missing` | - | Install has not yet been migrated. |
| `app/Http/Requests/Install/PortalRequest.php` | `Missing` | - | Install has not yet been migrated. |
| `app/Http/Requests/Staff/Circles/BaseCircleRequest.php` | `Partial` | `backend/internal/presentation/httpapi/staff_circles.go` | The new implementation is redesigned around `name/groupName/participationTypeId`. |
| `app/Http/Requests/Staff/Circles/CreateCircleRequest.php` | `Partial` | `backend/internal/presentation/httpapi/staff_circles.go` | Same difference as BaseCircleRequest. |
| `app/Http/Requests/Staff/Circles/ParticipationTypes/CreateParticipationTypeRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_participation_types.go`<br>`frontend/src/features/staff/participation-types/api.ts` | Implemented. |
| `app/Http/Requests/Staff/Circles/ParticipationTypes/ParticipationFormRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_participation_types.go`<br>`frontend/src/features/staff/participation-types/api.ts` | Implemented. |
| `app/Http/Requests/Staff/Circles/ParticipationTypes/UpdateParticipationTypeRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_participation_types.go`<br>`frontend/src/features/staff/participation-types/api.ts` | Implemented. |
| `app/Http/Requests/Staff/Circles/UpdateCircleRequest.php` | `Partial` | `backend/internal/presentation/httpapi/staff_circles.go` | Same difference as BaseCircleRequest. |
| `app/Http/Requests/Staff/Contacts/Categories/CategoryRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_masters.go`<br>`frontend/src/features/staff/masters/contactCategories.ts` | Implemented. |
| `app/Http/Requests/Staff/Documents/CreateDocumentRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_documents.go`<br>`frontend/src/features/staff/documents/api.ts` | Implemented. |
| `app/Http/Requests/Staff/Documents/UpdateDocumentRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_documents.go`<br>`frontend/src/features/staff/documents/api.ts` | Implemented. |
| `app/Http/Requests/Staff/Forms/AnswerRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_form_answers.go`<br>`frontend/src/features/staff/forms/answers.ts` | Implemented. |
| `app/Http/Requests/Staff/Forms/Editor/AddQuestionRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`frontend/src/features/staff/forms/api.ts` | Implemented. |
| `app/Http/Requests/Staff/Forms/Editor/DeleteQuestionRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`frontend/src/features/staff/forms/api.ts` | Implemented. |
| `app/Http/Requests/Staff/Forms/Editor/UpdateFormRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`frontend/src/features/staff/forms/api.ts` | Implemented. |
| `app/Http/Requests/Staff/Forms/Editor/UpdateQuestionRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`frontend/src/features/staff/forms/api.ts` | Implemented. |
| `app/Http/Requests/Staff/Forms/Editor/UpdateQuestionsOrderRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`frontend/src/features/staff/forms/api.ts` | Implemented. |
| `app/Http/Requests/Staff/Forms/FormRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_forms.go`<br>`frontend/src/features/staff/forms/api.ts` | Implemented. |
| `app/Http/Requests/Staff/Pages/PageRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_pages.go`<br>`frontend/src/features/staff/pages/api.ts` | Implemented. |
| `app/Http/Requests/Staff/Pages/PatchPinRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_pages.go`<br>`frontend/src/features/staff/pages/api.ts` | Implemented. |
| `app/Http/Requests/Staff/Places/PlaceRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_masters.go`<br>`frontend/src/features/staff/masters/places.ts` | Implemented. |
| `app/Http/Requests/Staff/Tags/TagRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_masters.go`<br>`frontend/src/features/staff/masters/tags.ts` | Implemented. |
| `app/Http/Requests/Staff/Users/UserRequest.php` | `Present` | `backend/internal/presentation/httpapi/staff_users.go`<br>`frontend/src/features/staff/users/api.ts` | Implemented. |
| `app/Http/Requests/Users/ChangeInfoRequest.php` | `Present` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`frontend/src/features/session/profile.ts` | Implemented. |
| `app/Http/Requests/Users/ChangePasswordRequest.php` | `Present` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`frontend/src/features/session/password.ts` | Implemented. |

## app/Mail

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Mail/Auth/EmailVerificationMailable.php` | `Missing` | - | email verification mail Not migrated. |
| `app/Mail/Circles/ApprovedMailable.php` | `Missing` | - | The approval workflow itself cannot be verified. |
| `app/Mail/Circles/RejectedMailable.php` | `Missing` | - | The rejected workflow itself cannot be confirmed. |
| `app/Mail/Circles/SubmittedMailable.php` | `Missing` | - | There is a submit, but I cannot confirm the submit notification mail. |
| `app/Mail/Contacts/ContactMailable.php` | `Partial` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`backend/internal/domain/mailqueue/repository.go` | Sending inquiries is expressed as a mail queue. |
| `app/Mail/Contacts/EmailCategoryMailable.php` | `Partial` | `backend/internal/presentation/httpapi/contact_profile.go` | Body assembly + queue instead of a dedicated template. |
| `app/Mail/Emails/SendEmailServiceMailable.php` | `Partial` | `backend/internal/presentation/httpapi/staff_mails.go`<br>`backend/internal/domain/mailqueue/repository.go` | Replaced with generic mail queue. |
| `app/Mail/Forms/AnswerConfirmationMailable.php` | `Partial` | `backend/internal/presentation/httpapi/staff_form_answers.go` | There is mail queue coordination, but it is not completely 1:1. |
| `app/Mail/Install/TestMailMailable.php` | `Missing` | - | install mail test Not migrated. |

## app/Notifications

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Notifications/Auth/Password/ResetStartNotification.php` | `Missing` | - | No reset start function. |
| `app/Notifications/Auth/StaffAuthNotification.php` | `Partial` | `backend/internal/presentation/httpapi/staff_verify.go`<br>`frontend/src/features/staff/status/api.ts` | There is a verify flow, but it is not a mail notification. |
| `app/Notifications/Users/PasswordChangedNotification.php` | `Partial` | `backend/internal/presentation/httpapi/contact_profile.go` | There is a password change, but no notification is sent. |

## app/Exports

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Exports/AnswersExport.php` | `Present` | `backend/internal/presentation/httpapi/staff_form_answers.go` | CSV export is implemented. |
| `app/Exports/CirclesExport.php` | `Present` | `backend/internal/presentation/httpapi/staff_circles.go` | CSV export is implemented. |
| `app/Exports/DocumentsExport.php` | `Present` | `backend/internal/presentation/httpapi/staff_documents.go` | CSV export is implemented. |
| `app/Exports/FormsExport.php` | `Present` | `backend/internal/presentation/httpapi/staff_forms.go` | CSV export is implemented. |
| `app/Exports/PagesExport.php` | `Present` | `backend/internal/presentation/httpapi/staff_pages.go` | CSV export is implemented. |
| `app/Exports/PlacesExport.php` | `Present` | `backend/internal/presentation/httpapi/staff_masters.go` | CSV export is implemented. |
| `app/Exports/TagsExport.php` | `Present` | `backend/internal/presentation/httpapi/staff_masters.go` | CSV export is implemented. |
| `app/Exports/UsersExport.php` | `Present` | `backend/internal/presentation/httpapi/staff_users.go` | CSV export is implemented. |

## app/GridMakers

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/GridMakers/ActivityLogGridMaker.php` | `Partial` | `backend/internal/presentation/httpapi/staff_activity_logs.go` | There is a list + pagination, but it is not a general-purpose grid/filter base. |
| `app/GridMakers/AnswersGridMaker.php` | `Partial` | `backend/internal/presentation/httpapi/staff_form_answers.go` | There is a list/CSV, but it is not a general-purpose grid. |
| `app/GridMakers/CirclesGridMaker.php` | `Partial` | `backend/internal/presentation/httpapi/staff_circles.go` | There is a list/CSV, but there is no filter framework. |
| `app/GridMakers/Concerns/UseEloquent.php` | `Missing` | - | Eloquent grid common infrastructure has not been migrated. |
| `app/GridMakers/DocumentsGridMaker.php` | `Partial` | `backend/internal/presentation/httpapi/staff_documents.go` | There is a list/CSV, but there is no grid infrastructure. |
| `app/GridMakers/Filter/FilterQueries.php` | `Missing` | - | The generic filter DSL has not been migrated. |
| `app/GridMakers/Filter/FilterQueryItem.php` | `Missing` | - | The generic filter DSL has not been migrated. |
| `app/GridMakers/Filter/FilterableKey.php` | `Missing` | - | The generic filter DSL has not been migrated. |
| `app/GridMakers/Filter/FilterableKeyBelongsToManyOptions.php` | `Missing` | - | The generic filter DSL has not been migrated. |
| `app/GridMakers/Filter/FilterableKeyBelongsToManyWithoutChoicesOptions.php` | `Missing` | - | The generic filter DSL has not been migrated. |
| `app/GridMakers/Filter/FilterableKeyBelongsToOptions.php` | `Missing` | - | The generic filter DSL has not been migrated. |
| `app/GridMakers/Filter/FilterableKeysDict.php` | `Missing` | - | The generic filter DSL has not been migrated. |
| `app/GridMakers/FormsGridMaker.php` | `Partial` | `backend/internal/presentation/httpapi/staff_forms.go` | There is a list/CSV, but there is no grid infrastructure. |
| `app/GridMakers/GridMakable.php` | `Missing` | - | General purpose grid interface Not migrated. |
| `app/GridMakers/Helpers/AnswerDetailsHelper.php` | `Partial` | `backend/internal/presentation/httpapi/form_answers.go`<br>`backend/internal/presentation/httpapi/staff_form_answers.go` | Distributed to answer summary/output processing. |
| `app/GridMakers/PagesGridMaker.php` | `Partial` | `backend/internal/presentation/httpapi/staff_pages.go` | List/search/CSV is available, but there is no grid infrastructure. |
| `app/GridMakers/PermissionsGridMaker.php` | `Partial` | `backend/internal/presentation/httpapi/staff_permissions.go` | There is list + pagination but no grid base. |
| `app/GridMakers/PlacesGridMaker.php` | `Partial` | `backend/internal/presentation/httpapi/staff_masters.go` | There is a list/CSV, but there is no grid infrastructure. |
| `app/GridMakers/TagsGridMaker.php` | `Partial` | `backend/internal/presentation/httpapi/staff_masters.go` | There is a list/CSV, but there is no grid infrastructure. |
| `app/GridMakers/UsersGridMaker.php` | `Partial` | `backend/internal/presentation/httpapi/staff_users.go` | There is a list/CSV, but there is no grid infrastructure. |

## app/Auth

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Auth/AppUserProvider.php` | `Partial` | `backend/internal/domain/auth/static.go`<br>`backend/internal/domain/auth/sqlc.go`<br>`backend/internal/presentation/httpapi/auth.go` | Authentication provider is replaced with Go authenticator + login handler. |

## app/Providers

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Providers/AppServiceProvider.php` | `Partial` | `backend/internal/presentation/httpapi/server.go`<br>`backend/internal/presentation/httpapi/session_bootstrap.go` | Laravel provider initialization has been reorganized to Go server configuration. |
| `app/Providers/AuthServiceProvider.php` | `Partial` | `backend/internal/presentation/httpapi/staff_access.go`<br>`backend/internal/domain/staffpermission/definitions.go` | Gate/policy registration replaced with capability judgment. |
| `app/Providers/BladeServiceProvider.php` | `Missing` | - | Blade specific. No 1:1 in SPA. |
| `app/Providers/BroadcastServiceProvider.php` | `Missing` | - | No broadcast mechanism. |
| `app/Providers/EventServiceProvider.php` | `Missing` | - | No Laravel event/listener based support. |
| `app/Providers/RouteServiceProvider.php` | `Partial` | `backend/internal/presentation/httpapi/routes.go`<br>`backend/internal/presentation/httpapi/server.go` | Route registration replaced with Go router. |

## app/Exceptions

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Exceptions/Handler.php` | `Partial` | `backend/internal/presentation/httpapi/errors.go` | Exception handling has been reorganized into error response for HTTP API. |

## app/Console

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Console/Kernel.php` | `Partial` | `backend/cmd/migrate/main.go`<br>`backend/cmd/worker/main.go`<br>`mise.toml` | Distributed to Go command + task runner instead of scheduler/artisan kernel. |

## app/Http/Middleware

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Http/Middleware/Authenticate.php` | `Partial` | `backend/internal/presentation/httpapi/auth.go`<br>`frontend/src/app/router/guards/auth.ts` | Authentication check is distributed to backend session + frontend guard. |
| `app/Http/Middleware/CheckEnv.php` | `Missing` | - | install/env check middleware has not been migrated. |
| `app/Http/Middleware/CheckSelectedCircle.php` | `Partial` | `backend/internal/presentation/httpapi/session_bootstrap.go`<br>`frontend/src/app/router/circleSelectorRedirect.ts` | Reorganized to selected circle control. |
| `app/Http/Middleware/DemoMode.php` | `Missing` | - | The new implementation of demo mode is unconfirmed. |
| `app/Http/Middleware/DenyIfInstalled.php` | `Missing` | - | The install flow has not yet been migrated. |
| `app/Http/Middleware/EncryptCookies.php` | `Partial` | `backend/internal/domain/session/sqlc.go` | There is a session cookie, but it is not Laravel cookie encryption middleware. |
| `app/Http/Middleware/EnsureEmailIsVerified.php` | `Missing` | - | email verify backend has not been migrated. |
| `app/Http/Middleware/ForceHttps.php` | `Partial` | `backend/internal/platform/config/config.go` | The HTTPS policy leans toward the config side, but there is no middleware 1:1. |
| `app/Http/Middleware/PreventRequestsDuringMaintenance.php` | `Missing` | - | Maintenance middleware is unconfirmed. |
| `app/Http/Middleware/RedirectIfAuthenticated.php` | `Partial` | `frontend/src/app/router/guards/public.ts` | Reorganized to public route guard. |
| `app/Http/Middleware/RedirectIfStaffNotAuthenticated.php` | `Partial` | `frontend/src/app/router/guards/staff.ts`<br>`backend/internal/presentation/httpapi/staff_access.go` | Reorganized staff access control. |
| `app/Http/Middleware/TrimStrings.php` | `Partial` | `backend/internal/presentation/httpapi/` | Input formatting is included in the handler side. |
| `app/Http/Middleware/TrustHosts.php` | `Missing` | - | Laravel host trust middleware is unconfirmed. |
| `app/Http/Middleware/TrustProxies.php` | `Missing` | - | The reverse proxy setting is within the candidate range and there is no explicit file. |
| `app/Http/Middleware/Turbolinks.php` | `Missing` | - | Turbolinks configuration is deprecated. |
| `app/Http/Middleware/UpdateLastAccessedAt.php` | `Missing` | - | The column corresponding to `last_accessed_at` is unconfirmed. |
| `app/Http/Middleware/ValidateSignature.php` | `Partial` | `backend/internal/presentation/httpapi/auth.go` | verify/reset, which requires a signed URL, has not been migrated. There is no middleware 1:1. |
| `app/Http/Middleware/VerifyCsrfToken.php` | `Partial` | `backend/internal/presentation/httpapi/auth.go` | Redesigned SPA + cookie session configuration. |

## app/Http/Responders

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Http/Responders/Respondable.php` | `Missing` | - | responder abstraction is not adopted. |
| `app/Http/Responders/Staff/Exceptions/GridMakerNotSetException.php` | `Missing` | - | Responder-specific exceptions are not used. |
| `app/Http/Responders/Staff/Exceptions/RequestNotSetException.php` | `Missing` | - | Responder-specific exceptions are not used. |
| `app/Http/Responders/Staff/GridResponder.php` | `Missing` | - | grid responder has not been migrated. Decomposed into functional API responses. |

## app/Http/Kernel.php

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/Http/Kernel.php` | `Partial` | `backend/internal/presentation/httpapi/server.go`<br>`backend/internal/presentation/httpapi/routes.go` | The HTTP kernel equivalent has been reorganized into a Go server/router configuration. |

## app/ReleaseInfo.php

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `app/ReleaseInfo.php` | `Missing` | - | The release-information model has not yet been migrated. |

## resources/views

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `resources/views/admin/activity_log/index.blade.php` | `Present` | `frontend/src/pages/staff/activity-logs.vue` | Moved to `/staff/activity-logs`. |
| `resources/views/admin/portal/form.blade.php` | `Present` | `frontend/src/pages/staff/settings/portal.vue` | Moved to `/staff/settings/portal`. |
| `resources/views/auth/login.blade.php` | `Present` | `frontend/src/pages/login.vue` | login screen. |
| `resources/views/auth/logout.blade.php` | `Partial` | `frontend/src/features/auth/api.ts`<br>`frontend/src/pages/login.vue` | There is no dedicated logout screen and it has been reorganized to session API + redirect. |
| `resources/views/auth/passwords/request.blade.php` | `Partial` | `frontend/src/pages/password/reset.vue` | There is a reset start UI, but the backend has not been migrated. |
| `resources/views/auth/passwords/reset.blade.php` | `Partial` | `frontend/src/pages/password/reset/[userId].vue` | There is a reset complete UI, but the backend has not been migrated. |
| `resources/views/auth/verify.blade.php` | `Partial` | `frontend/src/pages/email/verify.vue` | There is a verify UI, but the backend has not been migrated. |
| `resources/views/auth/verify_completed.blade.php` | `Partial` | `frontend/src/pages/email/verify/completed.vue` | There is a verify completed UI, but the backend has not been migrated. |
| `resources/views/circles/auth.blade.php` | `Missing` | - | No direct counterpart for the circle-auth-specific page could be confirmed. |
| `resources/views/circles/confirm.blade.php` | `Partial` | `frontend/src/pages/workspace/circles/detail.vue` | Integrated into the detail flow instead of the confirm dedicated page. |
| `resources/views/circles/delete.blade.php` | `Partial` | `frontend/src/pages/workspace/circles/detail.vue` | The page dedicated to delete confirm is integrated into detail. |
| `resources/views/circles/done.blade.php` | `Missing` | - | No direct counterpart for the legacy completion-page route could be confirmed. |
| `resources/views/circles/form.blade.php` | `Partial` | `frontend/src/pages/circles/new.vue`<br>`frontend/src/pages/workspace/circles/detail.vue` | create/edit is separated into new creation screen and workspace detail. |
| `resources/views/circles/selector.blade.php` | `Partial` | `frontend/src/pages/circles/select.vue`<br>`frontend/src/app/router/circleSelectorRedirect.ts` | The selector was moved to a Vue screen, and the Blade-based structure was removed. |
| `resources/views/circles/show.blade.php` | `Partial` | `frontend/src/pages/workspace/circles/detail.vue` | Project details have been reorganized to the workspace screen. |
| `resources/views/circles/users/index.blade.php` | `Partial` | `frontend/src/pages/workspace/circles/members.vue` | The member list is integrated into the workspace side. |
| `resources/views/circles/users/invite.blade.php` | `Partial` | `frontend/src/pages/workspace/circles/members.vue`<br>`frontend/src/pages/circles/join/[token].vue` | Invitation display/participation has been reorganized to the members + join screen. |
| `resources/views/contacts/form.blade.php` | `Present` | `frontend/src/pages/workspace/contact.vue` | Contact page. |
| `resources/views/documents/index.blade.php` | `Present` | `frontend/src/pages/workspace/documents/index.vue` | List/get documents for participants. |
| `resources/views/emails/auth/verify.blade.php` | `Missing` | - | email verify mail has not been migrated. |
| `resources/views/emails/circles/approve.blade.php` | `Missing` | - | Approval mail has not been migrated. |
| `resources/views/emails/circles/reject.blade.php` | `Missing` | - | Rejected mail has not been migrated. |
| `resources/views/emails/circles/submit.blade.php` | `Missing` | - | submit notification mail has not been migrated. |
| `resources/views/emails/contacts/category.blade.php` | `Partial` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`backend/internal/domain/mailqueue/repository.go` | Inquiry emails for categories are queued. |
| `resources/views/emails/contacts/contact.blade.php` | `Partial` | `backend/internal/presentation/httpapi/contact_profile.go`<br>`backend/internal/domain/mailqueue/repository.go` | Inquiry emails are queued. |
| `resources/views/emails/emails/send_email_service.blade.php` | `Partial` | `backend/internal/presentation/httpapi/staff_mails.go`<br>`backend/internal/domain/mailqueue/repository.go` | General-purpose email sending is queued. |
| `resources/views/emails/forms/answer_confirmation.blade.php` | `Partial` | `backend/internal/presentation/httpapi/staff_form_answers.go` | Part of the response confirmation email responsibility is queued. |
| `resources/views/emails/includes/question_email.blade.php` | `Partial` | `backend/internal/presentation/httpapi/staff_form_answers.go` | Responsibility for email body parts is absorbed by handler/worker. |
| `resources/views/emails/install/test_mail.blade.php` | `Missing` | - | install test mail has not been migrated. |
| `resources/views/errors/401.blade.php` | `Missing` | - | The Vue/Go side compatible files for the Laravel error pages group are not specified. |
| `resources/views/errors/403.blade.php` | `Missing` | - | The Vue/Go side compatible files for the Laravel error pages group are not specified. |
| `resources/views/errors/404.blade.php` | `Partial` | `frontend/src/pages/[...all].vue` | The not found screen has been reorganized into a catch-all page. |
| `resources/views/errors/419.blade.php` | `Missing` | - | The Vue/Go side compatible files for the Laravel error pages group are not specified. |
| `resources/views/errors/429.blade.php` | `Missing` | - | The Vue/Go side compatible files for the Laravel error pages group are not specified. |
| `resources/views/errors/500.blade.php` | `Missing` | - | The Vue/Go side compatible files for the Laravel error pages group are not specified. |
| `resources/views/errors/503.blade.php` | `Missing` | - | The Vue/Go side compatible files for the Laravel error pages group are not specified. |
| `resources/views/errors/layout.blade.php` | `Missing` | - | Laravel error layout has not been migrated. |
| `resources/views/errors/layout_no_drawer.blade.php` | `Missing` | - | Laravel error layout has not been migrated. |
| `resources/views/forms/answers/form.blade.php` | `Partial` | `frontend/src/pages/workspace/forms/[formId].vue` | Participant Integrated into answer screen. |
| `resources/views/forms/list.blade.php` | `Present` | `frontend/src/pages/workspace/forms/index.vue` | Participant form list. |
| `resources/views/home.blade.php` | `Present` | `frontend/src/pages/index.vue` | Home screen. |
| `resources/views/includes/bottom_tabs.blade.php` | `Partial` | `frontend/src/components/ui/TabStrip.vue`<br>`frontend/src/components/ui/BottomTabLink.vue` | Tab/navigation UI has been reorganized into Vue component. |
| `resources/views/includes/circle_info.blade.php` | `Partial` | `frontend/src/pages/workspace/circles/`<br>`frontend/src/pages/circles/` | The circle UI component is integrated into Vue page/component. |
| `resources/views/includes/circle_list_view_item_with_status.blade.php` | `Partial` | `frontend/src/pages/workspace/circles/`<br>`frontend/src/pages/circles/` | The circle UI component is integrated into Vue page/component. |
| `resources/views/includes/circle_register_header.blade.php` | `Partial` | `frontend/src/pages/workspace/circles/`<br>`frontend/src/pages/circles/` | The circle UI component is integrated into Vue page/component. |
| `resources/views/includes/circles_custom_form_instructions.blade.php` | `Partial` | `frontend/src/pages/workspace/circles/`<br>`frontend/src/pages/circles/` | The circle UI component is integrated into Vue page/component. |
| `resources/views/includes/day_calendar.blade.php` | `Missing` | - | New implementation of the calendar component cannot be confirmed. |
| `resources/views/includes/drawer.blade.php` | `Partial` | `frontend/src/components/ui/NavMenuLink.vue` | drawer/navigation has been reorganized into Vue app shell. |
| `resources/views/includes/head_ui_theme.blade.php` | `Partial` | `frontend/src/features/session/theme.ts` | Theme switching is moved to the frontend side. |
| `resources/views/includes/head_ui_theme_dark.blade.php` | `Partial` | `frontend/src/features/session/theme.ts` | Theme switching is moved to the frontend side. |
| `resources/views/includes/head_ui_theme_light.blade.php` | `Partial` | `frontend/src/features/session/theme.ts` | Theme switching is moved to the frontend side. |
| `resources/views/includes/install_header.blade.php` | `Missing` | - | The install flow has not yet been migrated. |
| `resources/views/includes/loading.blade.php` | `Partial` | `frontend/src/components/ui/SurfaceCard.vue` | Loading display is distributed to each Vue component/page. |
| `resources/views/includes/participation_forms_list.blade.php` | `Partial` | `frontend/src/pages/workspace/circles/`<br>`frontend/src/pages/circles/` | The circle UI component is integrated into Vue page/component. |
| `resources/views/includes/question.blade.php` | `Partial` | `frontend/src/components/forms/AnswerQuestionFields.vue` | Replaced question drawing with Vue component. |
| `resources/views/includes/staff_answers_tab_strip.blade.php` | `Partial` | `frontend/src/components/ui/TabStrip.vue`<br>`frontend/src/components/ui/BottomTabLink.vue` | Tab/navigation UI has been reorganized into Vue component. |
| `resources/views/includes/staff_circles_tab_strip.blade.php` | `Partial` | `frontend/src/components/ui/TabStrip.vue`<br>`frontend/src/components/ui/BottomTabLink.vue` | Tab/navigation UI has been reorganized into Vue component. |
| `resources/views/includes/staff_home_tab_strip.blade.php` | `Partial` | `frontend/src/components/ui/TabStrip.vue`<br>`frontend/src/components/ui/BottomTabLink.vue` | Tab/navigation UI has been reorganized into Vue component. |
| `resources/views/includes/top_circle_selector.blade.php` | `Partial` | `frontend/src/pages/workspace/circles/`<br>`frontend/src/pages/circles/` | The circle UI component is integrated into Vue page/component. |
| `resources/views/includes/user_register_form.blade.php` | `Partial` | `frontend/src/pages/register.vue` | Integrated into Vue page instead of dedicated partial template. |
| `resources/views/includes/user_settings_tab_strip.blade.php` | `Partial` | `frontend/src/components/ui/TabStrip.vue`<br>`frontend/src/components/ui/BottomTabLink.vue` | Tab/navigation UI has been reorganized into Vue component. |
| `resources/views/install/admin/form.blade.php` | `Missing` | - | The install view has not yet been migrated. |
| `resources/views/install/database/form.blade.php` | `Missing` | - | The install view has not yet been migrated. |
| `resources/views/install/index.blade.php` | `Missing` | - | The install view has not yet been migrated. |
| `resources/views/install/mail/form.blade.php` | `Missing` | - | The install view has not yet been migrated. |
| `resources/views/install/mail/test.blade.php` | `Missing` | - | The install view has not yet been migrated. |
| `resources/views/install/portal/form.blade.php` | `Missing` | - | The install view has not yet been migrated. |
| `resources/views/layouts/app.blade.php` | `Partial` | `frontend/src/pages/`<br>`frontend/src/components/ui/` | Layout responsibilities are distributed between the Vue app shell and each page. |
| `resources/views/layouts/legacy.blade.php` | `Partial` | `frontend/src/pages/`<br>`frontend/src/components/ui/` | Layout responsibilities are distributed between the Vue app shell and each page. |
| `resources/views/layouts/no_drawer.blade.php` | `Partial` | `frontend/src/pages/`<br>`frontend/src/components/ui/` | Layout responsibilities are distributed between the Vue app shell and each page. |
| `resources/views/pages/list.blade.php` | `Present` | `frontend/src/pages/workspace/pages/index.vue` | Participant page list. |
| `resources/views/pages/show.blade.php` | `Present` | `frontend/src/pages/workspace/pages/[pageId].vue` | participant page details. |
| `resources/views/privacy_policy.blade.php` | `Present` | `frontend/src/pages/privacy_policy.vue`<br>`resources/md/privacy_policy.md` | Replace privacy policy with Vue page + markdown loading. |
| `resources/views/staff/about.blade.php` | `Present` | `frontend/src/pages/staff/about.vue` | About page. |
| `resources/views/staff/circles/data_grid.blade.php` | `Partial` | `frontend/src/pages/staff/circles/index.vue` | table/pagination is included in the list screen. |
| `resources/views/staff/circles/form.blade.php` | `Partial` | `frontend/src/pages/staff/circles/index.vue`<br>`frontend/src/pages/staff/circles/[circleId].vue` | create/edit is separated. |
| `resources/views/staff/circles/index.blade.php` | `Present` | `frontend/src/pages/staff/circles/index.vue` | List page. |
| `resources/views/staff/circles/participation_types/create.blade.php` | `Partial` | `frontend/src/pages/staff/participation-types/index.vue` | Inline create. |
| `resources/views/staff/circles/participation_types/edit.blade.php` | `Present` | `frontend/src/pages/staff/participation-types/[typeId].vue` | Edit page. |
| `resources/views/staff/circles/participation_types/form/edit.blade.php` | `Partial` | `frontend/src/pages/staff/participation-types/[typeId].vue` | form settings are integrated into detail. |
| `resources/views/staff/circles/participation_types/form/editor.blade.php` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | There is no dedicated editor, but integrated into the generic form editor. |
| `resources/views/staff/circles/send_emails/form.blade.php` | `Partial` | `frontend/src/pages/staff/circles/[circleId].vue` | Integrated into mail section of circle detail. Waiting emails have not been migrated. |
| `resources/views/staff/circles/selector.blade.php` | `Missing` | - | New screens that directly correspond to the specified target range cannot be confirmed. |
| `resources/views/staff/contacts/categories/delete.blade.php` | `Partial` | `frontend/src/pages/staff/contact-categories.vue` | The dedicated delete-confirmation page was removed. |
| `resources/views/staff/contacts/categories/form.blade.php` | `Partial` | `frontend/src/pages/staff/contact-categories.vue` | inline create/Edit page. |
| `resources/views/staff/contacts/categories/index.blade.php` | `Present` | `frontend/src/pages/staff/contact-categories.vue` | List page. |
| `resources/views/staff/documents/form.blade.php` | `Partial` | `frontend/src/pages/staff/documents/index.vue`<br>`frontend/src/pages/staff/documents/[documentId]/edit.vue` | Separated into create/edit. |
| `resources/views/staff/documents/index.blade.php` | `Present` | `frontend/src/pages/staff/documents/index.vue` | List page. |
| `resources/views/staff/forms/answers/form.blade.php` | `Partial` | `frontend/src/pages/staff/forms/[formId]/answers/create.vue`<br>`frontend/src/pages/staff/forms/[formId]/answers/[answerId]/edit.vue` | Split into create/edit. |
| `resources/views/staff/forms/answers/index.blade.php` | `Present` | `frontend/src/pages/staff/forms/[formId]/answers/index.vue` | Answer list page. |
| `resources/views/staff/forms/answers/notanswered/index.blade.php` | `Present` | `frontend/src/pages/staff/forms/[formId]/not_answered.vue` | Unanswered list page. |
| `resources/views/staff/forms/answers/uploads/index.blade.php` | `Present` | `frontend/src/pages/staff/forms/[formId]/answers/uploads.vue` | Uploads ZIP page. |
| `resources/views/staff/forms/copy/index.blade.php` | `Partial` | `frontend/src/pages/staff/forms/index.vue`<br>`frontend/src/pages/staff/forms/[formId]/index.vue` | Reorganized to button operation instead of dedicated copy page. |
| `resources/views/staff/forms/editor.blade.php` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | Dedicated editor blade is discontinued. |
| `resources/views/staff/forms/editor_frame.blade.php` | `Missing` | - | The frame construct is obsolete. |
| `resources/views/staff/forms/form.blade.php` | `Partial` | `frontend/src/pages/staff/forms/index.vue`<br>`frontend/src/pages/staff/forms/[formId]/index.vue` | create/edit is separated. |
| `resources/views/staff/forms/index.blade.php` | `Present` | `frontend/src/pages/staff/forms/index.vue` | List page. |
| `resources/views/staff/forms/preview.blade.php` | `Present` | `frontend/src/pages/staff/forms/[formId]/preview.vue` | Preview page. |
| `resources/views/staff/home.blade.php` | `Present` | `frontend/src/pages/staff/index.vue` | Staff top page. |
| `resources/views/staff/markdown_guide.blade.php` | `Present` | `frontend/src/pages/staff/markdown-guide.vue` | Markdown guide page. |
| `resources/views/staff/pages/form.blade.php` | `Partial` | `frontend/src/pages/staff/pages/index.vue`<br>`frontend/src/pages/staff/pages/[pageId].vue` | create/edit is separated into list + details. |
| `resources/views/staff/pages/index.blade.php` | `Present` | `frontend/src/pages/staff/pages/index.vue` | List page. |
| `resources/views/staff/permissions/form.blade.php` | `Present` | `frontend/src/pages/staff/permissions/[userId].vue` | Detail/edit page. |
| `resources/views/staff/permissions/index.blade.php` | `Present` | `frontend/src/pages/staff/permissions/index.vue` | List page. |
| `resources/views/staff/places/form.blade.php` | `Partial` | `frontend/src/pages/staff/places.vue` | inline create/Edit page. |
| `resources/views/staff/places/index.blade.php` | `Present` | `frontend/src/pages/staff/places.vue` | List page. |
| `resources/views/staff/send_emails/index.blade.php` | `Partial` | `frontend/src/pages/staff/mails.vue` | Generic mail queue. cancel has not been migrated. |
| `resources/views/staff/tags/delete.blade.php` | `Partial` | `frontend/src/pages/staff/tags.vue` | The dedicated delete-confirmation page was removed. |
| `resources/views/staff/tags/form.blade.php` | `Partial` | `frontend/src/pages/staff/tags.vue` | inline create/Edit page. |
| `resources/views/staff/tags/index.blade.php` | `Present` | `frontend/src/pages/staff/tags.vue` | List page. |
| `resources/views/staff/users/form.blade.php` | `Present` | `frontend/src/pages/staff/users/[userId].vue` | Detail/edit page. |
| `resources/views/staff/users/index.blade.php` | `Present` | `frontend/src/pages/staff/users/index.vue` | List page. |
| `resources/views/staff/verify/index.blade.php` | `Present` | `frontend/src/pages/staff/verify.vue` | Verify page. |
| `resources/views/support.blade.php` | `Present` | `frontend/src/pages/support.vue` | The support page has been converted to Vue. |
| `resources/views/users/appearance.blade.php` | `Present` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/theme.ts` | Appearance settings page. |
| `resources/views/users/change_password.blade.php` | `Present` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/password.ts` | Password change page. |
| `resources/views/users/delete.blade.php` | `Partial` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/deleteAccount.ts` | The deletion confirmation page is integrated into the settings flow. |
| `resources/views/users/edit.blade.php` | `Present` | `frontend/src/pages/workspace/settings.vue`<br>`frontend/src/features/session/profile.ts` | Profile edit page. |
| `resources/views/users/register.blade.php` | `Partial` | `frontend/src/pages/register.vue` | There is a registration screen, but the backend has not been migrated. |
| `resources/views/vendor/mail/html/button.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/html/footer.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/html/header.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/html/layout.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/html/message.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/html/panel.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/html/promotion.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/html/promotion/button.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/html/subcopy.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/html/table.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/html/themes/default.css` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/text/button.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/text/footer.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/text/header.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/text/layout.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/text/message.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/text/panel.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/text/promotion.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/text/promotion/button.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/text/subcopy.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/mail/text/table.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/notifications/email.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/self-update/mails/update-available.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |
| `resources/views/vendor/self-update/self-update.blade.php` | `Missing` | - | Laravel vendor view overrides are not used. |

## resources/js

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `resources/js/forms_editor/EditorApp.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor app is integrated into staff form detail. |
| `resources/js/forms_editor/components/EditorContent.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/EditorError.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/EditorHeader.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/EditorLoading.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/EditorSidebar.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/form/EditPanel.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/form/FormHeader.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/form/FormItem.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/form/QuestionCheckbox.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/form/QuestionHeading.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/form/QuestionNumber.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/form/QuestionRadio.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/form/QuestionSelect.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/form/QuestionText.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/form/QuestionTextarea.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/components/form/QuestionUpload.vue` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | The editor UI was merged into the detail page. |
| `resources/js/forms_editor/index.js` | `Partial` | `frontend/src/pages/staff/forms/[formId]/index.vue` | editor entry is integrated into staff form detail. |
| `resources/js/forms_editor/store/api/index.js` | `Partial` | `frontend/src/features/staff/forms/api.ts` | editor state/repository has been reorganized into feature API and page state. |
| `resources/js/forms_editor/store/api/repository.js` | `Partial` | `frontend/src/features/staff/forms/api.ts` | editor state/repository has been reorganized into feature API and page state. |
| `resources/js/forms_editor/store/editor.js` | `Partial` | `frontend/src/features/staff/forms/api.ts` | editor state/repository has been reorganized into feature API and page state. |
| `resources/js/forms_editor/store/index.js` | `Partial` | `frontend/src/features/staff/forms/api.ts` | editor state/repository has been reorganized into feature API and page state. |
| `resources/js/forms_editor/store/status.js` | `Partial` | `frontend/src/features/staff/forms/api.ts` | editor state/repository has been reorganized into feature API and page state. |
| `resources/js/v2/app.js` | `Partial` | `frontend/src/app/main.ts` | SPA bootstrap has been migrated to Vite/Vue app. |
| `resources/js/v2/components/AppAccordion.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppBadge.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppChip.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppChipsContainer.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppContainer.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppDropdown.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppDropdownItem.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppFixedFormFooter.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppFooter.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppHeader.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppInfoBox.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppNavBar.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppNavBarBack.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppNavBarToggle.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppTabs.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/AppearanceSettings.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/CardLink.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/CircleSelectorDropdown.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/ContentIframe.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/DataGrid.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/DataGridEditor.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/DataGridFilter.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/DataGridFilterAddDropdown.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/DataGridShortcutLink.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/DataGridTable.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/FormWithConfirm.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/Forms/QuestionCheckbox.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/Forms/QuestionHeading.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/Forms/QuestionItem.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/Forms/QuestionNumber.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/Forms/QuestionRadio.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/Forms/QuestionSelect.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/Forms/QuestionText.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/Forms/QuestionTextarea.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/Forms/QuestionUpload.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/HomeHeader.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/IconButton.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/InstallMailSettingsForm.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | The install itself has not been migrated, but the UI component responsibilities are absorbed into the Vue component/page reconfiguration. |
| `resources/js/v2/components/LayoutColumn.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/LayoutRow.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/ListView.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/ListViewActionBtn.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/ListViewBaseItem.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/ListViewCard.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/ListViewEmpty.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/ListViewFormGroup.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/ListViewItem.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/ListViewPagination.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/ListViewStudentIdAndUnivemailInput.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/MarkdownEditor.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/MarkdownEditorIcons.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/PermissionsSelector.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/SearchInput.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/SideWindow.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/SideWindowContainer.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/StepsList.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/StepsListItem.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/TagsInput.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/TopAlert.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/components/UiPrimaryColorPicker.vue` | `Partial` | `frontend/src/components/`<br>`frontend/src/pages/` | Reworked into Vue 3 components/pages. This is not a 1:1 mapping. |
| `resources/js/v2/utils/formDisabling.js` | `Partial` | `frontend/src/components/forms/AnswerQuestionFields.vue`<br>`frontend/src/pages/staff/forms/[formId]/index.vue` | Form invalidation behavior is distributed to each component/page. |
| `resources/js/v2/vue-turbolinks.js` | `Missing` | - | Turbolinks premise is obsolete. |

## resources/sass

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `resources/sass/_variables.scss` | `Partial` | `frontend/src/styles/app.css` | Style responsibilities have been reorganized into the entire frontend CSS. |
| `resources/sass/app.scss` | `Partial` | `frontend/src/styles/app.css` | Style responsibilities have been reorganized into the entire frontend CSS. |
| `resources/sass/bootstrap.scss` | `Missing` | - | Bootstrap base configuration is not adopted. |
| `resources/sass/forms_editor.scss` | `Partial` | `frontend/src/styles/app.css` | Style responsibilities have been reorganized into the entire frontend CSS. |
| `resources/sass/v2/_normalize.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/_variables.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/app.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/layout/_base.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/layout/_content.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/layout/_drawer.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/layout/_error.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/layout/_main_wrapper.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/libs/_v-tooltip.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/modules/_bottom_tabs.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/modules/_btn.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/modules/_day_calendar.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/modules/_forms.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/modules/_jumbotron.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/modules/_loading.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/modules/_markdown.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/modules/_qrcode.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/modules/_tab_strip.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/modules/_wysiwyg.sass` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/utils/_link.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/utils/_pull.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/utils/_screenreader.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/utils/_spacing.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |
| `resources/sass/v2/utils/_text.scss` | `Partial` | `frontend/src/styles/app.css` | The v2 layout/module/utils responsibilities were reimplemented on the Tailwind/CSS side. This is not a 1:1 mapping. |

## resources/md

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `resources/md/privacy_policy.md` | `Present` | `frontend/src/pages/privacy_policy.vue` | Raw import markdown and display. |

## resources/img

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `resources/img/dropdownTriangle.svg` | `Missing` | - | No explicit migration target could be confirmed, and the new `frontend/public` equivalent is not yet set up. |
| `resources/img/dropdownTriangleDark.svg` | `Missing` | - | No explicit migration target could be confirmed, and the new `frontend/public` equivalent is not yet set up. |
| `resources/img/portalDotsLogoDark.svg` | `Missing` | - | No explicit migration target could be confirmed, and the new `frontend/public` equivalent is not yet set up. |
| `resources/img/portalDotsLogoLight.svg` | `Missing` | - | No explicit migration target could be confirmed, and the new `frontend/public` equivalent is not yet set up. |

## config

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `config/activitylog.php` | `Partial` | `backend/db/migrations/0003_activity_logs.sql`<br>`backend/internal/domain/activitylog/repository.go`<br>`frontend/src/features/staff/admin/activityLogs.ts` | activity log is migrated. Not per Spatie configuration. |
| `config/app.php` | `Partial` | `backend/internal/platform/config/config.go`<br>`backend/cmd/api/main.go`<br>`frontend/src/pages/staff/settings/portal.vue` | APP name/URL/HTTPS/portal settings are migrated to Go side. service provider/alias/locale bootstrap is not 1:1. |
| `config/auth.php` | `Partial` | `backend/internal/presentation/httpapi/auth.go`<br>`backend/internal/domain/auth/sqlc.go`<br>`backend/internal/domain/session/sqlc.go`<br>`frontend/src/features/auth/api.ts` | Session authentication has been moved to an original implementation. guard/provider/password broker has not been migrated. |
| `config/broadcasting.php` | `Missing` | - | WebSocket/Broadcast functionality is not implemented. |
| `config/cache.php` | `Missing` | - | General-purpose cache layer has not been confirmed. |
| `config/cors.php` | `Missing` | - | Explicit CORS configuration file on the new backend side has not been confirmed. |
| `config/database.php` | `Partial` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/migrate.go`<br>`backend/db/migrations/0001_init.sql` | DB connection/migration has been moved to the Go side. Redesigned based on PostgreSQL premise. |
| `config/dotenv-editor.php` | `Missing` | - | `.env` Edit UI/package has not been migrated. |
| `config/excel.php` | `Partial` | `backend/api/openapi.yaml`<br>`frontend/src/pages/staff/exports.vue` | CSV export is distributed to each API. Excel/import/xlsx/pdf settings have not been migrated. |
| `config/filesystems.php` | `Partial` | `backend/api/openapi.yaml`<br>`backend/db/migrations/0004_answer_uploads.sql`<br>`backend/db/migrations/0005_staff_document_uploads.sql` | There are files upload/download, but they are saved in PostgreSQL bytea instead of disk. |
| `config/hashing.php` | `Partial` | `backend/internal/platform/database/seed.go`<br>`backend/go.mod` | Continued to use bcrypt. It is not migrated as a hash driver setting. |
| `config/logging.php` | `Partial` | `backend/cmd/api/main.go`<br>`backend/cmd/worker/main.go` | There is basic log output, but there is no channel/stack setting of 1:1. |
| `config/mail.php` | `Partial` | `backend/db/migrations/0002_mail_jobs.sql`<br>`backend/internal/app/worker/mailer.go`<br>`frontend/src/features/staff/admin/mails.ts` | Email sending responsibility is transferred to mail queue + worker. There is no 1:1 mailer setting. |
| `config/permission.php` | `Partial` | `backend/db/migrations/0016_user_permissions.sql`<br>`backend/internal/domain/staffpermission/definitions.go`<br>`frontend/src/features/staff/access/capabilities.ts`<br>`frontend/src/features/staff/permissions/api.ts` | The concept of authority is a transition. Spatie package dependency structure is implemented independently. |
| `config/portal.php` | `Partial` | `backend/internal/platform/config/config.go`<br>`backend/internal/domain/portalsetting/repository.go`<br>`backend/internal/presentation/httpapi/staff_portal_settings.go`<br>`frontend/src/features/staff/admin/portalSettings.ts` | The main part of the portal settings will be migrated. `enable_demo_mode` is unconfirmed. |
| `config/queue.php` | `Partial` | `backend/db/migrations/0002_mail_jobs.sql`<br>`backend/cmd/worker/main.go`<br>`backend/internal/app/worker/mailer.go` | Migrate to a mail queue instead of a general-purpose queue. |
| `config/sanctum.php` | `Partial` | `backend/internal/presentation/httpapi/auth.go`<br>`backend/internal/domain/session/sqlc.go`<br>`frontend/src/features/session/api.ts` | It has cookie-based authentication, but not Sanctum. |
| `config/services.php` | `Missing` | - | Compatibility with the new side for third-party service settings has not been confirmed. |
| `config/session.php` | `Partial` | `backend/internal/platform/config/config.go`<br>`backend/internal/domain/session/sqlc.go`<br>`backend/db/queries/sessions.sql` | DB sessions and cookie TTL are migrated. Driver list etc. are no longer necessary. |
| `config/view.php` | `Missing` | - | Blade/View compilation is obsolete. |

## database/migrations

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `database/migrations/2014_10_11_000000_create_fundamental_tables.php` | `Partial` | `backend/db/migrations/0001_init.sql`<br>`backend/db/migrations/0006_master_data.sql`<br>`backend/db/migrations/0022_booths.sql` | Main business tables have been migrated. The old roles/session system is no longer needed or redesigned. |
| `database/migrations/2014_10_12_000000_create_users_table.php` | `Partial` | `backend/db/migrations/0001_init.sql`<br>`backend/db/migrations/0011_user_memberships.sql`<br>`backend/db/migrations/0016_user_permissions.sql`<br>`backend/db/queries/users.sql` | user has been migrated, but the column structure has been simplified and redesigned. |
| `database/migrations/2019_05_11_114945_create_schedules_table.php` | `Missing` | - | The schedule function was later removed on the Laravel side as well. No support for new backend. |
| `database/migrations/2019_05_14_094310_create_forms_table.php` | `Present` | `backend/db/migrations/0001_init.sql`<br>`backend/db/migrations/0009_form_settings.sql`<br>`backend/db/queries/forms.sql` | forms itself has been migrated. |
| `database/migrations/2019_05_14_094627_create_questions_table.php` | `Partial` | `backend/db/migrations/0007_form_questions.sql`<br>`backend/db/queries/form_questions.sql` | questions is migration. options has been integrated into JSONB. |
| `database/migrations/2019_05_14_094944_create_options_table.php` | `Partial` | `backend/db/migrations/0007_form_questions.sql` | Options are integrated into `form_questions.options` instead of a separate table. |
| `database/migrations/2019_05_14_095201_create_answers_table.php` | `Partial` | `backend/db/migrations/0001_init.sql`<br>`backend/db/migrations/0014_answers_multi.sql`<br>`backend/db/queries/answers.sql` | The answer is migration. Redesigned support for multiple answers. |
| `database/migrations/2019_05_14_095233_create_answer_details_table.php` | `Present` | `backend/db/migrations/0008_answer_details.sql`<br>`backend/db/queries/answers.sql` | Answer detail has been migrated. |
| `database/migrations/2019_08_19_000000_create_failed_jobs_table.php` | `Missing` | - | Laravel general queue failure management is not adopted. |
| `database/migrations/2019_12_11_001433_add_is_leader_to_circle_user.php` | `Present` | `backend/db/migrations/0011_user_memberships.sql`<br>`backend/db/queries/circles.sql` | `circle_user.is_leader` has been migrated. |
| `database/migrations/2019_12_15_112737_make_description_of_forms_nullable.php` | `Missing` | - | forms.description nullable Differences are not inherited. |
| `database/migrations/2019_12_16_134839_create_emails_table.php` | `Partial` | `backend/db/migrations/0002_mail_jobs.sql`<br>`backend/internal/app/worker/mailer.go` | Redesigned to `mail_jobs` instead of `emails`. |
| `database/migrations/2019_12_17_000010_drop_options_table.php` | `Partial` | `backend/db/migrations/0007_form_questions.sql` | The conclusion of abolishing separate tables has been carried over and implemented with JSONB options from the beginning. |
| `database/migrations/2019_12_17_140054_add_options_to_questions.php` | `Present` | `backend/db/migrations/0007_form_questions.sql` | Responsibilities for question options have been migrated. |
| `database/migrations/2020_01_01_215414_add_is_signed_up_to_users.php` | `Missing` | - | The sign-up status column of user is not adopted in the new schema. |
| `database/migrations/2020_03_03_225623_change_is_signed_up.php` | `Missing` | - | `signed_up_at` is also not adopted in the new schema. |
| `database/migrations/2020_03_24_175904_create_custom_forms_table.php` | `Partial` | `backend/db/migrations/0015_participation_types.sql`<br>`backend/db/queries/forms.sql` | There is no dedicated table for custom_forms, and it has been reorganized to relate to participation type forms. |
| `database/migrations/2020_03_24_180220_update_circles_table_for_user_registration.php` | `Partial` | `backend/db/migrations/0021_circle_workspace.sql`<br>`backend/db/queries/circles.sql` | invitation/submitted/notes are migrated. The status system has not been migrated. |
| `database/migrations/2020_03_24_180431_drop_name_column_from_booths_table.php` | `Present` | `backend/db/migrations/0022_booths.sql` | New booth schema has no name column. |
| `database/migrations/2020_04_19_164557_create_tags_table.php` | `Present` | `backend/db/migrations/0006_master_data.sql`<br>`backend/db/queries/tags.sql` | tags master has been migrated. |
| `database/migrations/2020_04_19_164621_create_circle_tag_table.php` | `Partial` | `backend/db/migrations/0010_page_visibility_and_relations.sql`<br>`backend/db/queries/circles.sql` | Redesigned to `circles.tags` array instead of pivot. |
| `database/migrations/2020_04_22_184559_add_is_verified_by_staff_column_to_users.php` | `Partial` | `backend/db/migrations/0011_user_memberships.sql`<br>`backend/internal/presentation/httpapi/staff_users.go` | The verified concept has been simplified and moved to `users.is_verified` and staff verify flows. |
| `database/migrations/2020_05_04_145607_add_is_admin_to_users.php` | `Partial` | `backend/db/migrations/0016_user_permissions.sql`<br>`backend/internal/domain/staffpermission/definitions.go` | Redesigned to role/permission model instead of `is_admin` column. |
| `database/migrations/2020_05_27_020759_create_page_viewable_tags_table.php` | `Partial` | `backend/db/migrations/0010_page_visibility_and_relations.sql`<br>`backend/db/queries/pages.sql` | Consolidated into `pages.viewable_tags` array instead of pivot. |
| `database/migrations/2020_06_02_212931_create_contact_categories_table.php` | `Present` | `backend/db/migrations/0006_master_data.sql`<br>`backend/db/queries/contact_categories.sql` | Contact categories have been migrated. |
| `database/migrations/2020_06_10_175842_add_file_info_columns_to_documents.php` | `Partial` | `backend/db/queries/documents.sql`<br>`backend/api/openapi.yaml` | filename/mime_type is retained. size/extension is calculated using API. |
| `database/migrations/2020_06_10_184810_rename_filename_to_path_at_documents.php` | `Missing` | - | The new backend maintains `filename` and does not use rename to `path`. |
| `database/migrations/2020_06_13_021339_create_reads_table.php` | `Missing` | - | read/unread tracking table has not been migrated. |
| `database/migrations/2020_06_14_025312_create_form_answerable_tags_table.php` | `Partial` | `backend/db/migrations/0009_form_settings.sql`<br>`backend/db/queries/forms.sql` | Moved to `forms.answerable_tags` array instead of pivot. |
| `database/migrations/2020_07_21_213552_add_last_accessed_at_to_users.php` | `Missing` | - | The column equivalent to `last_accessed_at` is unconfirmed in the new schema. |
| `database/migrations/2020_08_23_234631_add_foreign_keys_in_tags.php` | `Partial` | `backend/db/migrations/0006_master_data.sql`<br>`backend/db/migrations/0010_page_visibility_and_relations.sql`<br>`backend/db/migrations/0015_participation_types.sql` | There is tags itself, but some of the old pivot groups have been replaced with array columns. |
| `database/migrations/2020_10_24_161242_add_fulltext_index_to_pages.php` | `Partial` | `backend/db/queries/pages.sql` | There is a search API, but it is LIKE-based rather than 1:1 like MySQL ngram fulltext index. |
| `database/migrations/2020_12_06_065242_drop_extra_columns_from_booths_table.php` | `Present` | `backend/db/migrations/0022_booths.sql` | We have already migrated to a minimal booth configuration. |
| `database/migrations/2020_12_06_204534_add_timestamps_to_places_table.php` | `Present` | `backend/db/migrations/0006_master_data.sql`<br>`backend/db/queries/places.sql` | Retain created_at/updated_at. |
| `database/migrations/2021_03_09_232637_add_foreign_keys_in_circles.php` | `Partial` | `backend/db/migrations/0001_init.sql`<br>`backend/db/migrations/0011_user_memberships.sql`<br>`backend/db/migrations/0022_booths.sql` | circles Reference FK is mostly absorbed into the final schema. The `circle_tag` side is converted into an array and does not have a 1:1 ratio. |
| `database/migrations/2021_03_09_234725_add_foreign_keys_in_answers.php` | `Present` | `backend/db/migrations/0001_init.sql`<br>`backend/db/migrations/0008_answer_details.sql` | answers/answer_details FK has been absorbed into the final schema. |
| `database/migrations/2021_04_25_002148_drop_old_role_tables.php` | `Missing` | - | Cleanup of old role tables is not necessary with clean-slate PostgreSQL schema. |
| `database/migrations/2021_04_25_003007_create_permission_tables.php` | `Partial` | `backend/db/migrations/0016_user_permissions.sql`<br>`backend/internal/domain/staffpermission/definitions.go` | The permission feature has been migrated. However, Spatie structure is not adopted. |
| `database/migrations/2021_04_25_121743_drop_ci_sessions_table.php` | `Missing` | - | Old CI session cleanup is no longer required. The new side has its own `sessions` table. |
| `database/migrations/2021_05_11_095506_create_activity_log_table.php` | `Partial` | `backend/db/migrations/0003_activity_logs.sql`<br>`backend/db/queries/activity_logs.sql` | activity log is migrated. However, it is not a general purpose activitylog schema. |
| `database/migrations/2021_05_21_134318_drop_created_by_and_updated_by_columns.php` | `Missing` | - | The state after this cleanup is directly reflected in the new schema, and there are no individual migrations. |
| `database/migrations/2021_05_23_012143_add_foreign_keys_in_page_viewable_tags.php` | `Missing` | - | `page_viewable_tags` table itself has been replaced with array column design. |
| `database/migrations/2021_05_23_015052_add_foreign_keys_in_reads.php` | `Missing` | - | The reads function itself has not been migrated. |
| `database/migrations/2021_05_23_120313_add_is_pinned_and_is_public_to_pages.php` | `Present` | `backend/db/migrations/0001_init.sql`<br>`backend/db/queries/pages.sql` | page public/pinned display has been migrated. |
| `database/migrations/2021_11_23_172700_drop_schedules_table.php` | `Missing` | - | The new schema assumes the final state after schedule removal. |
| `database/migrations/2021_11_23_172908_drop_schedule_id_column_from_documents_table.php` | `Missing` | - | The final form of documents without schedule_id is the initial state of the new schema. |
| `database/migrations/2022_02_19_172600_add_univemail_columns_to_users.php` | `Missing` | - | University email split columns have not been migrated as user schema. |
| `database/migrations/2022_03_12_232724_add_uuid_column_to_failed_jobs.php` | `Missing` | - | failed_jobs itself has not been migrated. |
| `database/migrations/2022_03_19_121551_create_document_page_table.php` | `Partial` | `backend/db/migrations/0010_page_visibility_and_relations.sql`<br>`backend/db/queries/pages.sql` | Redesigned to `pages.document_ids` array instead of pivot. |
| `database/migrations/2022_11_20_142022_add_event_column_to_activity_log_table.php` | `Partial` | `backend/db/migrations/0003_activity_logs.sql` | `event` is not a dedicated column, but absorbs responsibility into action/summary. |
| `database/migrations/2022_11_20_142023_add_batch_uuid_column_to_activity_log_table.php` | `Missing` | - | The equivalent of batch_uuid has not been confirmed in the new activity log schema. |
| `database/migrations/2023_05_02_135408_create_participation_types_table.php` | `Present` | `backend/db/migrations/0015_participation_types.sql`<br>`backend/db/queries/participation_types.sql`<br>`frontend/src/pages/staff/participation-types/index.vue` | participation types have been migrated. |
| `database/migrations/2023_05_02_140533_add_participation_type_id_to_circles.php` | `Present` | `backend/db/migrations/0015_participation_types.sql`<br>`backend/db/queries/circles.sql` | circles.participation_type_id has been migrated. |
| `database/migrations/2023_05_02_141549_create_participation_type_tag_table.php` | `Partial` | `backend/db/migrations/0015_participation_types.sql`<br>`backend/db/queries/participation_types.sql` | Redesigned to `participation_types.tags` array instead of pivot. |
| `database/migrations/2023_05_03_142350_add_foreign_keys_in_questions.php` | `Present` | `backend/db/migrations/0007_form_questions.sql` | form_questions.form_id FK has been absorbed into the new schema. |
| `database/migrations/2023_05_04_123732_add_foreign_keys_in_answers.php` | `Present` | `backend/db/migrations/0001_init.sql` | answers.form_id FK has been absorbed into the new schema. |
| `database/migrations/2023_05_04_123939_add_foreign_keys_in_answer_details.php` | `Present` | `backend/db/migrations/0008_answer_details.sql` | answer_details.question_id FK has been migrated. |
| `database/migrations/2023_05_06_215006_add_confirmation_message_column_to_forms.php` | `Present` | `backend/db/migrations/0009_form_settings.sql`<br>`backend/db/queries/forms.sql` | confirmation_message has been migrated. |
| `database/migrations/2023_05_24_223230_add_can_change_group_name_to_circles.php` | `Missing` | - | The column equivalent to `can_change_group_name` is unconfirmed in the new schema. |

## database/seeders

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `database/seeders/DatabaseSeeder.php` | `Partial` | `backend/internal/platform/database/seed.go`<br>`backend/internal/platform/config/config.go` | The Laravel seeder body is empty, but the new backend inserts Go seed when the DB is empty. |

## database/factories

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `database/factories/AnswerDetailFactory.php` | `Partial` | `backend/db/migrations/0008_answer_details.sql`<br>`backend/db/queries/answers.sql` | answer detail The entity has been migrated. No factory layer. |
| `database/factories/AnswerFactory.php` | `Partial` | `backend/db/queries/answers.sql`<br>`backend/db/migrations/0014_answers_multi.sql` | answer The entity has been migrated. There is no factory mechanism. |
| `database/factories/CircleFactory.php` | `Partial` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go` | The circle entity is in seed/demo data, but the factory mechanism itself has not been migrated. |
| `database/factories/ContactEmailFactory.php` | `Partial` | `backend/db/migrations/0002_mail_jobs.sql`<br>`backend/db/queries/contact_categories.sql` | There is an inquiry/email sending function, but there is no 1:1 of the old factory. |
| `database/factories/DocumentFactory.php` | `Partial` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go`<br>`backend/db/queries/documents.sql` | The document entity has been migrated. factory has not been migrated. |
| `database/factories/EmailFactory.php` | `Partial` | `backend/db/migrations/0002_mail_jobs.sql`<br>`backend/internal/app/worker/mailer_test.go` | There is a basis for mail queue testing, but there is no 1:1 of the old Email model factory. |
| `database/factories/FormFactory.php` | `Partial` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go`<br>`backend/db/queries/forms.sql` | There is a form seed and schema, but no factory. |
| `database/factories/PageFactory.php` | `Partial` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go`<br>`backend/db/queries/pages.sql` | page entity has been migrated. factory has not been migrated. |
| `database/factories/ParticipationTypeFactory.php` | `Partial` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go`<br>`backend/db/queries/participation_types.sql` | participation type entity has been migrated. factory has not been migrated. |
| `database/factories/PlaceFactory.php` | `Partial` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go`<br>`backend/db/queries/places.sql` | place entity has been migrated. factory has not been migrated. |
| `database/factories/QuestionFactory.php` | `Partial` | `backend/db/migrations/0007_form_questions.sql`<br>`backend/db/queries/form_questions.sql` | The question entity has been migrated. No factory layer. |
| `database/factories/ReadFactory.php` | `Missing` | - | The reads function itself has not been migrated. |
| `database/factories/TagFactory.php` | `Partial` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go`<br>`backend/db/queries/tags.sql` | tag entity has been migrated. factory has not been migrated. |
| `database/factories/UserFactory.php` | `Partial` | `backend/internal/platform/config/config.go`<br>`backend/internal/platform/database/seed.go`<br>`backend/db/queries/users.sql` | There is a user seed, but there is no Laravel factory. |

## tests

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `tests/CreatesApplication.php` | `Missing` | - | Laravel app bootstrap for tests. |
| `tests/Feature/CheckPermissionsTest.php` | `Partial` | `backend/internal/domain/staffpermission/definitions.go`<br>`frontend/src/features/staff/access/capabilities.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | Although the authority judgment has been migrated, it is not in the Gate/Policy test format. |
| `tests/Feature/Eloquents/CircleTest.php` | `Partial` | `backend/internal/domain/circle/catalog.go`<br>`backend/internal/domain/circle/sqlc.go`<br>`backend/internal/presentation/httpapi/server_test.go` | The circle domain has been migrated, but not the Eloquent model test. |
| `tests/Feature/Exports/AnswersExportTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/answers/index.test.ts` | answers export is migration. |
| `tests/Feature/Exports/CirclesExportTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/circles/index.test.ts` | circles export is a migration. |
| `tests/Feature/Exports/DocumentsExportTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/documents/index.test.ts` | documents export is a migration. |
| `tests/Feature/Exports/FormsExportTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/index.test.ts` | forms export is a migration. |
| `tests/Feature/Exports/PagesExportTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/pages/index.test.ts` | pages export is a migration. |
| `tests/Feature/Exports/PlacesExportTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/places.test.ts` | places export is a migration. |
| `tests/Feature/Exports/TagsExportTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/tags.test.ts` | tags export is a migration. |
| `tests/Feature/Exports/UsersExportTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/users/index.test.ts` | users export is a migration. |
| `tests/Feature/GridMakers/DocumentsGridMakerTest.php` | `Partial` | `frontend/src/pages/staff/documents/index.test.ts`<br>`backend/db/queries/documents.sql` | The equivalent of documents grid has been migrated, but there is no 1:1 per class. |
| `tests/Feature/GridMakers/PagesGridMakerTest.php` | `Partial` | `backend/db/queries/pages.sql`<br>`frontend/src/pages/staff/pages/index.test.ts` | The page list has been migrated, but GridMaker has not been adopted. |
| `tests/Feature/GridMakers/UsersGridMakerTest.php` | `Partial` | `backend/internal/presentation/httpapi/pagination.go`<br>`frontend/src/pages/staff/users/index.test.ts` | List/paging has been migrated, but there is no GridMaker class. |
| `tests/Feature/GridMakers/Filter/FilterQueriesTest.php` | `Partial` | `backend/db/queries/pages.sql`<br>`backend/internal/presentation/httpapi/pagination.go` | List/filter itself has been moved to API query, but the framework is different. |
| `tests/Feature/GridMakers/Filter/FilterQueryItemTest.php` | `Missing` | - | Specific to the Laravel filter framework. |
| `tests/Feature/GridMakers/Filter/FilterableKeyBelongsToManyOptionsTest.php` | `Missing` | - | Specific to the Laravel filter framework. |
| `tests/Feature/GridMakers/Filter/FilterableKeyBelongsToOptionsTest.php` | `Missing` | - | Specific to the Laravel filter framework. |
| `tests/Feature/GridMakers/Filter/FilterableKeyTest.php` | `Missing` | - | Specific to the Laravel filter framework. |
| `tests/Feature/GridMakers/Filter/FilterableKeysDictTest.php` | `Missing` | - | Specific to the Laravel filter framework. |
| `tests/Feature/Http/Controllers/Auth/LoginControllerTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/login.test.ts` | The login flow has been migrated. |
| `tests/Feature/Http/Controllers/Circles/BaseTestCase.php` | `Missing` | - | Laravel circles controller test foundation. There is no 1:1 counterpart in the new stack. |
| `tests/Feature/Http/Controllers/Circles/CreateActionTest.php` | `Present` | `frontend/src/pages/circles/new.test.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | circle create is migration. |
| `tests/Feature/Http/Controllers/Circles/DeleteActionTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go` | There is something equivalent to delete action in the API, but the old route/UI's 1:1 is weak. |
| `tests/Feature/Http/Controllers/Circles/DestroyActionTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go` | The UI support for the participant's own circle destroy is not clear and is centered around the API. |
| `tests/Feature/Http/Controllers/Circles/DoneActionTest.php` | `Missing` | - | Compatibility with the new route for the old completion screen has not been confirmed. |
| `tests/Feature/Http/Controllers/Circles/EditActionTest.php` | `Partial` | `frontend/src/pages/workspace/circles/detail.test.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | participant circle edit is a transition. |
| `tests/Feature/Http/Controllers/Circles/ShowActionTest.php` | `Partial` | `frontend/src/pages/workspace/circles/detail.test.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | circle Details are reorganized to the workspace screen. |
| `tests/Feature/Http/Controllers/Circles/SubmitActionTest.php` | `Partial` | `frontend/src/pages/workspace/circles/detail.test.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | submitted_at is a migration. Screen/route is reconfigured. |
| `tests/Feature/Http/Controllers/Circles/UpdateActionTest.php` | `Partial` | `frontend/src/pages/workspace/circles/detail.test.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | circle update is migration. |
| `tests/Feature/Http/Controllers/Circles/Users/DestroyActionTest.php` | `Partial` | `frontend/src/pages/workspace/circles/members.test.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | Member deletion will be migrated. |
| `tests/Feature/Http/Controllers/Circles/Users/StoreActionTest.php` | `Partial` | `frontend/src/pages/workspace/circles/members.test.ts`<br>`backend/internal/presentation/httpapi/server_test.go` | Adding members/inviting join has been migrated. |
| `tests/Feature/Http/Controllers/Contacts/PostActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/contact.test.ts` | Contact post has been migrated. |
| `tests/Feature/Http/Controllers/Documents/ShowActionTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/documents/index.test.ts` | There is participant document download, but it is not 1:1 of Laravel show page structure. |
| `tests/Feature/Http/Controllers/Forms/Answers/CreateActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/forms/[formId].test.ts` | answer participant create screen transition. |
| `tests/Feature/Http/Controllers/Forms/Answers/EditActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/forms/[formId].test.ts` | Answer participant edit is transition. |
| `tests/Feature/Http/Controllers/Forms/Answers/StoreActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/forms/[formId].test.ts` | Answer participant submit is a transition. |
| `tests/Feature/Http/Controllers/Forms/Answers/Uploads/ShowActionTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/forms/[formId].test.ts` | participant upload download has been migrated. |
| `tests/Feature/Http/Controllers/HomeActionTest.php` | `Present` | `frontend/src/pages/index.test.ts` | The home screen has been moved to the Vue side. |
| `tests/Feature/Http/Controllers/Install/HomeActionTest.php` | `Missing` | - | The install flow is new and unconfirmed. |
| `tests/Feature/Http/Controllers/Pages/IndexActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/pages/index.test.ts` | participant page list has been migrated. |
| `tests/Feature/Http/Controllers/Pages/ShowActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/pages/[pageId].test.ts` | participant page detail is migrated. |
| `tests/Feature/Http/Controllers/Staff/Circles/CreateActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/circles/index.test.ts` | staff circle create is a transition. |
| `tests/Feature/Http/Controllers/Staff/Circles/DestroyActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/circles/index.test.ts` | staff circle delete is a migration. |
| `tests/Feature/Http/Controllers/Staff/Circles/EditActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/circles/[circleId].test.ts` | staff circle edit is a transition. |
| `tests/Feature/Http/Controllers/Staff/Circles/ExportActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/circles/index.test.ts` | staff circles export is a migration. |
| `tests/Feature/Http/Controllers/Staff/Documents/DestroyActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/documents/index.test.ts` | staff document delete is a migration. |
| `tests/Feature/Http/Controllers/Staff/Documents/ExportActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/documents/index.test.ts` | staff document export is a migration. |
| `tests/Feature/Http/Controllers/Staff/Documents/ShowActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/documents/[documentId]/edit.test.ts` | staff document detail has been migrated. |
| `tests/Feature/Http/Controllers/Staff/Documents/StoreActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/documents/index.test.ts` | staff document upload has been migrated. |
| `tests/Feature/Http/Controllers/Staff/Documents/UpdateActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/documents/[documentId]/edit.test.ts` | staff document update is a migration. |
| `tests/Feature/Http/Controllers/Staff/Forms/CopyActionTest.php` | `Missing` | - | Compatibility with the new side test of the form copy function cannot be confirmed. |
| `tests/Feature/Http/Controllers/Staff/Forms/DestroyActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/index.test.ts` | staff form delete is a migration. |
| `tests/Feature/Http/Controllers/Staff/Forms/Editor/GetQuestionsActionTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/index.test.ts` | form question editor has been migrated. |
| `tests/Feature/Http/Controllers/Staff/Forms/ExportActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/index.test.ts` | staff forms export is a migration. |
| `tests/Feature/Http/Controllers/Staff/Forms/Answers/DestroyActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/answers/index.test.ts` | answer delete is migration. |
| `tests/Feature/Http/Controllers/Staff/Forms/Answers/ExportActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/answers/index.test.ts` | staff form answers export is a migration. |
| `tests/Feature/Http/Controllers/Staff/Forms/Answers/Uploads/DownloadZipActionTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/answers/uploads.test.ts` | There is a ZIP/bulk download system, but it is not Laravel action 1:1. |
| `tests/Feature/Http/Controllers/Staff/Forms/Answers/Uploads/ShowActionTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/answers/uploads.test.ts` | upload/download has been migrated. |
| `tests/Feature/Http/Controllers/Staff/HomeActionTest.php` | `Partial` | `frontend/src/pages/staff/index.test.ts` | staff home has been moved to a Vue page. Demo mode branch has not been migrated. |
| `tests/Feature/Http/Controllers/Staff/Pages/DestroyActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/pages/[pageId].test.ts` | staff page delete is a migration. |
| `tests/Feature/Http/Controllers/Staff/Pages/ExportActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/pages/index.test.ts` | staff page export is a migration. |
| `tests/Feature/Http/Controllers/Staff/Pages/StoreActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/pages/index.test.ts` | staff page create has been migrated. |
| `tests/Feature/Http/Controllers/Staff/Permissions/UpdateActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/permissions/[userId].test.ts` | staff permissions update is a migration. |
| `tests/Feature/Http/Controllers/Staff/Places/ExportActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/places.test.ts` | staff places export is a migration. |
| `tests/Feature/Http/Controllers/Staff/Tags/DestroyActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/tags.test.ts` | staff tags delete is a migration. |
| `tests/Feature/Http/Controllers/Staff/Tags/ExportActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/tags.test.ts` | staff tags export is a migration. |
| `tests/Feature/Http/Controllers/Staff/Users/ExportActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/users/index.test.ts` | staff users export is a migration. |
| `tests/Feature/Http/Controllers/Staff/Users/UpdateActionTest.php` | `Present` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/users/[userId].test.ts` | staff user update is a migration. |
| `tests/Feature/Http/Controllers/Staff/Verify/IndexActionTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/verify.test.ts` | The staff verify flow has been migrated. |
| `tests/Feature/Http/Controllers/Users/DestroyActionTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/settings.test.ts` | Self-account deletion will be migrated. |
| `tests/Feature/Http/Middleware/DemoModeTest.php` | `Missing` | - | Demo mode is not confirmed in the new stack. |
| `tests/Feature/Http/Responders/Staff/GridResponderTest.php` | `Missing` | - | The Laravel responder/grid layer is not used in the new stack. |
| `tests/Feature/Services/Circles/CirclesServiceTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/circles/detail.test.ts`<br>`frontend/src/pages/circles/new.test.ts` | The circles feature has been migrated, but not per service class. |
| `tests/Feature/Services/Contacts/ContactCategoriesServiceTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/contact-categories.test.ts` | Contact category management has been migrated. |
| `tests/Feature/Services/Contacts/ContactsServeceTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/contact.test.ts` | Contact sending/history functionality has been moved to API/UI testing. |
| `tests/Feature/Services/Documents/DocumentsServiceTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/documents/index.test.ts`<br>`frontend/src/pages/staff/documents/index.test.ts` | Documents functionality has been moved to API/UI testing. |
| `tests/Feature/Services/Emails/SendEmailsServiceTest.php` | `Partial` | `backend/internal/app/worker/mailer_test.go`<br>`frontend/src/pages/staff/mails.test.ts` | Redesigned mail queue/worker. |
| `tests/Feature/Services/Forms/AnswerDetailsServiceTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/forms/[formId].test.ts` | answer_details exists in new API. |
| `tests/Feature/Services/Forms/AnswersServiceTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/forms/[formId].test.ts` | Although the response function has been migrated, it is not per service layer. |
| `tests/Feature/Services/Forms/DownloadZipServiceTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/staff/forms/[formId]/answers/uploads.test.ts` | There is an upload download/export system, but there is no 1:1 service name unit. |
| `tests/Feature/Services/Forms/FormsServiceTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/forms/index.test.ts`<br>`frontend/src/pages/staff/forms/index.test.ts` | forms functionality moved to API/UI. |
| `tests/Feature/Services/Pages/PagesServiceTest.php` | `Partial` | `backend/internal/presentation/httpapi/server_test.go`<br>`frontend/src/pages/workspace/pages/index.test.ts`<br>`frontend/src/pages/workspace/pages/[pageId].test.ts` | Although the pages function has been migrated, it has been reorganized into API/UI tests instead of per service class. |
| `tests/Feature/Services/Pages/ReadsServiceTest.php` | `Missing` | - | The reads function has not been migrated. |
| `tests/Feature/Services/Utils/DotenvServiceTest.php` | `Missing` | - | dotenv editing function itself has not been migrated. |
| `tests/Feature/Services/Utils/FormatTextServiceTest.php` | `Missing` | - | Old utility service unit tests have not been migrated. |
| `tests/Feature/Services/Utils/ValueObjects/VersionTest.php` | `Missing` | - | Equivalent ValueObject test not confirmed. |
| `tests/TestFile.png` | `Missing` | - | Laravel test image fixture. No 1:1 counterpart could be confirmed in the new stack. |
| `tests/TestCase.php` | `Missing` | - | Laravel TestCase foundation. The new side uses Go test / Vitest. |
| `tests/Unit/ExampleTest.php` | `Missing` | - | Laravel template test. |

## lang

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `lang/en/auth.php` | `Missing` | - | The English translation file could not be confirmed in the new stack. |
| `lang/en/pagination.php` | `Missing` | - | English translation files have not been migrated. |
| `lang/en/passwords.php` | `Missing` | - | English password reset dictionary has not been migrated. |
| `lang/en/validation.php` | `Missing` | - | English validation dictionary has not been migrated. |
| `lang/ja/auth.php` | `Partial` | `backend/internal/presentation/httpapi/auth.go`<br>`frontend/src/pages/login.vue` | Login failure text is distributed to the new code side. There is no migration as a translation file. |
| `lang/ja/pagination.php` | `Partial` | `backend/internal/presentation/httpapi/pagination.go`<br>`frontend/src/lib/pagination.ts` | There is pagination logic, but it is not dictionaryd. |
| `lang/ja/passwords.php` | `Partial` | `frontend/src/pages/password/reset.vue`<br>`frontend/src/pages/workspace/settings.vue` | There is a password change UI, but the reset mail flow has not been migrated. |
| `lang/ja/validation.php` | `Partial` | `backend/internal/presentation/httpapi/auth.go`<br>`backend/internal/presentation/httpapi/contact_profile.go`<br>`frontend/src/lib/api/validation.ts` | Validation text is distributed for each endpoint/UI. |

## bootstrap, public, artisan, composer.json, composer.lock, phpunit.xml, phpcs.xml

| Laravel path | Status | New paths | Notes |
|---|---|---|---|
| `bootstrap/app.php` | `Partial` | `backend/cmd/api/main.go`<br>`backend/internal/platform/database/dependencies.go` | Application initialization/IoC has been moved to Go dependency construction. |
| `public/index.php` | `Partial` | `backend/cmd/api/main.go`<br>`frontend/src/app/main.ts` | HTTP entrypoint is separated into Go API + Vue SPA. |
| `public/.htaccess` | `Missing` | - | Apache rewrite/PHP upload control is no longer required. |
| `public/robots.txt` | `Missing` | - | The new frontend has not yet been published. |
| `public/favicon.ico` | `Missing` | - | The favicon placement on the new frontend side is unconfirmed. |
| `public/.user.ini` | `Missing` | - | PHP upload restriction settings are no longer required. |
| `artisan` | `Partial` | `backend/cmd/migrate/main.go`<br>`backend/cmd/worker/main.go`<br>`mise.toml` | CLI entries are distributed to migrate/worker/mise task. There is no equivalent to general-purpose artisan. |
| `composer.json` | `Partial` | `backend/go.mod`<br>`frontend/package.json`<br>`packages/api-client/package.json`<br>`package.json`<br>`mise.toml` | Dependencies and scripts were split across multiple manifests. Laravel/Sanctum/Spatie/Excel equivalents are either reimplemented independently or not yet migrated. |
| `composer.lock` | `Partial` | `backend/go.mod`<br>`frontend/package.json`<br>`packages/api-client/package.json` | Although the manifest is distributed, there is no strict lockfile correspondence within the candidate range. |
| `phpunit.xml` | `Partial` | `mise.toml`<br>`frontend/package.json`<br>`backend/internal/presentation/httpapi/server_test.go` | The test execution infrastructure has been moved to Go test / Vitest / mise task. |
| `phpcs.xml` | `Partial` | `mise.toml`<br>`frontend/package.json` | Static analysis/formatting has been moved to Go/Vue side tools. |


## Main Remaining / Partially Migrated Topics

- In authentication, register, the production password reset flow, and the email verification backend are still not migrated, so some areas remain UI-first.
- Most staff-side features are migrated, but `send_emails` queue-wide deletion, the old dedicated forms editor/frame setup, and staff copy mail for circle-targeted mail are still missing.
- `reads`, `release info`, the install flow, broadcasting, and Laravel-specific provider/responders/grid/filter foundations are either not migrated or replaced with different Go/Vue designs.
- The database has migrated the main business tables, but many pivot tables were redesigned as array columns, and gaps remain around `failed_jobs`, `schedule`, `last_accessed_at`, `univemail`, and `circle status` fields.
- `public/robots.txt`, `public/favicon.ico`, English translation files, the factory layer, and some legacy Laravel layer-specific tests are still not set up in the new structure.

## Explicitly Missing / Not Yet Added

### install flow
- What is missing: the setup wizard, database/mail/portal configuration steps, admin bootstrap, and install test mail flow.
- Not yet added in: `backend/internal/presentation/httpapi/`, `backend/internal/platform/config/`, `frontend/src/pages/`, and `frontend/src/features/`; the only concrete references remain the legacy-only paths `routes/install.php`, `app/Http/Controllers/Install/`, `app/Services/Install/`, and `resources/views/install/`.

### register / password reset / email verify backend
- What is missing: production backend endpoints and mail/token handling for registration, password reset start/complete, and email verification/resend.
- Not yet added in: `backend/internal/presentation/httpapi/auth.go`, `backend/internal/domain/auth/`, and the related feature/API layers under `frontend/src/features/auth/`; current coverage is UI-heavy in `frontend/src/pages/register.vue`, `frontend/src/pages/password/reset.vue`, `frontend/src/pages/password/reset/[userId].vue`, `frontend/src/pages/email/verify.vue`, and `frontend/src/pages/email/verify/[type]/[userId].vue`.

### reads/unread tracking
- What is missing: page/document read marks, unread counts, and a migrated replacement for the reads pivot/table behavior.
- Not yet added in: `backend/db/migrations/`, `backend/internal/domain/page/`, `backend/internal/presentation/httpapi/pages.go`, `frontend/src/features/pages/`, and `frontend/src/pages/workspace/pages/`.

### production mail delivery / specific mail templates
- What is missing: a fully migrated production mail delivery story for verification/reset flows and specific templates for approval, rejection, submit, and install test mail.
- Not yet added in: feature-specific backend/template counterparts around `backend/internal/app/worker/mailer.go`, `backend/internal/domain/mailqueue/`, and any new-template location under `frontend/` or `backend/`; the legacy-only references remain `app/Mail/`, `app/Notifications/`, and `resources/views/emails/`.

### staff mail cancel/delete-all
- What is missing: queue-wide cancel/delete-all behavior for staff mail management.
- Not yet added in: `backend/internal/presentation/httpapi/staff_mails.go`, `frontend/src/features/staff/admin/mails.ts`, and `frontend/src/pages/staff/mails.vue`.

### circle approval/rejection workflow
- What is missing: approval/rejection status handling and the related notification/mail workflow for circles.
- Not yet added in: `backend/internal/presentation/httpapi/staff_circles.go`, `backend/internal/domain/circle/`, `backend/internal/domain/mailqueue/`, and `frontend/src/pages/staff/circles/`.

### release info
- What is missing: release/version retrieval and an equivalent release-info model/value-object layer.
- Not yet added in: `backend/internal/`, `frontend/src/`, and any migrated counterpart for `app/ReleaseInfo.php` or `app/Services/Utils/ReleaseInfoService.php`.

### frontend public assets like robots.txt/favicon/images
- What is missing: migrated public assets such as `robots.txt`, `favicon.ico`, and the legacy image set.
- Not yet added in: `frontend/public/`; the legacy-only references remain `public/robots.txt`, `public/favicon.ico`, and `resources/img/`.

### Laravel-specific grid/responder/provider/filter abstractions
- What is missing: direct counterparts for Laravel-specific grid maker, responder, provider bootstrapping, and filter abstraction layers.
- Not yet added in: there is no direct abstraction layer under `backend/internal/` or `frontend/src/`; the behavior was replaced by feature-specific handlers, repositories, pages, and router/server setup instead of migrating `app/GridMakers/`, `app/Http/Responders/`, and parts of `app/Providers/` 1:1.

### broadcasting / console routes / demo mode / maintenance mode
- What is missing: broadcasting/channel support, a direct Laravel-style console-routes counterpart, demo mode handling, and maintenance mode middleware behavior.
- Not yet added in: `backend/internal/presentation/httpapi/`, `backend/cmd/`, and `frontend/src/app/router/guards/` as direct equivalents; the current partial replacements are `backend/cmd/migrate/main.go`, `backend/cmd/worker/main.go`, and `mise.toml`, but no migrated counterparts were identified for `routes/channels.php`, `routes/console.php` as a route registry, `app/Http/Middleware/DemoMode.php`, or `app/Http/Middleware/PreventRequestsDuringMaintenance.php`.
