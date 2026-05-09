# Backend Map

バックエンドで「どこに何があるか」を feature から逆引きするための索引です。

| Concern | HTTP entry | Domain | SQL |
| --- | --- | --- | --- |
| Public / Auth / Session | `internal/controllers/auth*.go`, `session_bootstrap.go`, `contact_profile.go`, `staff_verify.go` | `internal/domain/auth`, `internal/domain/session`, `internal/domain/pendingregistration`, `internal/domain/registrationmail` | `db/queries/users.sql`, `sessions.sql`, `pending_registrations.sql` |
| Workspace / Circles | `internal/controllers/circles*.go` | `internal/domain/circle`, `internal/domain/participationtype` | `db/queries/circles.sql`, `participation_types.sql` |
| Workspace / Pages | `internal/controllers/pages.go` | `internal/domain/page`, `internal/domain/document` | `db/queries/pages.sql`, `documents.sql` |
| Workspace / Forms | `internal/controllers/forms.go`, `form_answer_*.go`, `workspace_form_helpers.go` | `internal/domain/form`, `internal/domain/formquestion`, `internal/domain/answer` | `db/queries/forms.sql`, `form_questions.sql`, `answers.sql` |
| Staff / Users & Permissions | `internal/controllers/staff_users*.go`, `staff_permissions.go`, `staff_access.go` | `internal/domain/useradmin`, `internal/domain/staffpermission` | `db/queries/users.sql` |
| Staff / Circles & Participation Types | `internal/controllers/staff_circles*.go`, `staff_participation_types.go` | `internal/domain/circle`, `internal/domain/participationtype`, `internal/domain/booth` | `db/queries/circles.sql`, `participation_types.sql`, `booths.sql` |
| Staff / Pages & Documents | `internal/controllers/staff_pages.go`, `staff_documents.go` | `internal/domain/page`, `internal/domain/document`, `internal/domain/tag` | `db/queries/pages.sql`, `documents.sql`, `tags.sql` |
| Staff / Forms & Answers | `internal/controllers/staff_forms*.go`, `staff_form_answers_*.go` | `internal/domain/form`, `internal/domain/formquestion`, `internal/domain/answer` | `db/queries/forms.sql`, `form_questions.sql`, `answers.sql` |
| Staff / Masters | `internal/controllers/staff_masters.go` | `internal/domain/tag`, `internal/domain/place`, `internal/domain/contactcategory` | `db/queries/tags.sql`, `places.sql`, `contact_categories.sql` |
| Staff / Admin | `internal/controllers/staff_activity_logs.go`, `staff_exports.go`, `staff_mails.go`, `staff_portal_settings.go` | `internal/domain/activitylog`, `internal/domain/portalsetting` | `db/queries/activity_logs.sql` |

## Entrypoints

- API 起動: `cmd/api/main.go`
- DB wiring: `internal/platform/database/dependencies.go`
- HTTP composition root: `internal/http/server/entrypoint.go`
- Legacy HTTP implementation: `internal/controllers/`
