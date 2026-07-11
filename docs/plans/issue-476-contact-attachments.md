# Issue #476: Contact attachment implementation plan

## Objective

Allow an authenticated participant to add one optional file to a contact submission. Store the file in PortalDots and include a permanent opaque download link in the email sent to the selected contact category.

Issue: <https://github.com/s-union/PortalDots/issues/476>

## Agreed decisions

- Deliver the file through a PortalDots download link rather than as an email attachment.
- Use an opaque, non-expiring bearer token because a contact category recipient is not guaranteed to have a PortalDots account or staff session.
- Support one optional file per contact submission.
- Limit the file to 5 MiB, matching the existing form-answer upload limit.
- Put the download link only in the category-recipient email. The participant confirmation email shows the filename but does not expose the bearer URL.
- Retain the attachment and its download link indefinitely. Deletion happens only through the contact's ownership lifecycle.
- Keep the existing category-derived subject, confirmation-recipient behavior, and contact history behavior unless a step below explicitly changes them.
- Do not introduce S3, R2, or another dependency. Existing uploads are stored in PostgreSQL, so this change stays within the current deployment model.

## Current-state findings

- The participant UI submits JSON from `frontend/src/pages/workspace/contact.vue` through `frontend/src/features/contact/api.ts`.
- `POST /contact` accepts `application/json` in `backend/api/openapi.yaml` and is implemented by `submitContact` in `backend/internal/controllers/contact_profile.go`.
- A contact submission is not a first-class domain record. `GET /contact` reconstructs history by parsing entries from `outbound_mails`.
- The email pipeline has no attachment contract. Adding file bytes to the queue is not viable because Cloudflare Queues limits one message to 128 KB.
- Form-answer uploads already provide useful patterns for bounded reads, empty-file checks, server-side MIME detection, PostgreSQL `bytea` storage, and multipart frontend requests. Their domain tables cannot be reused because they require form, answer, circle, and question relationships.
- Multipart parsing currently happens in external-ID middleware before handlers. The implementation must enforce a request-body limit before that parse, not only use `io.LimitReader` after `FormFile` returns.

## Data model

Add first-class contact persistence instead of attaching files to `outbound_mails`.

### `contacts`

- `id uuid primary key default uuidv7()`
- `user_id uuid not null references users(id) on delete cascade`
- `circle_id uuid not null references circles(id) on delete cascade`
- `category_id uuid not null`
- `category_name text not null`
- `subject text not null`
- `body text not null`
- `status text not null`
- `staff_mail_job_id text not null unique`
- `created_at timestamptz not null default now()`

Store the category ID and name as submission-time snapshots. Do not add a foreign key to `contact_categories`, because deleting a category must not delete or invalidate historical contacts.

### `contact_attachments`

- `id uuid primary key default uuidv7()`
- `contact_id uuid not null unique references contacts(id) on delete cascade`
- `filename text not null`
- `mime_type text not null`
- `size_bytes bigint not null`
- `content bytea not null`
- `download_token_hash bytea not null unique`
- `created_at timestamptz not null default now()`

Generate at least 32 random bytes with `crypto/rand`, encode the raw token with base64url for the URL, and store only its SHA-256 digest. Treat the URL as a bearer credential and never log the raw token.

## Implementation steps

### 1. Add contact persistence

1. Add a migration with `contacts`, `contact_attachments`, owner, token-digest, and history indexes.
2. Add focused SQL queries for creating a contact and optional attachment in one transaction, listing a user's contacts, finding an attachment by token digest, and deleting a contact with its attachment.
3. Generate sqlc code using `mise run backend:sqlc:generate`.
4. Add a `backend/internal/domain/contact` repository with PostgreSQL and memory implementations. Keep token generation and hashing in the domain or a small shared helper so handlers never store a raw token.
5. Make creation transactional: either both the contact and attachment exist, or neither exists.

Ordering rationale: persistence establishes the ownership and lifecycle model before HTTP and mail behavior depend on it.

### 2. Change the HTTP contract to multipart

1. Change `POST /contact` in `backend/api/openapi.yaml` from `application/json` to `multipart/form-data` with `categoryId`, `subject`, `body`, `ccSubleader`, and optional binary `file` fields.
2. Add optional attachment metadata to contact responses and history entries: `filename`, `mimeType`, and `sizeBytes`.
3. Add `GET /contact/attachments/{token}` as an unauthenticated bearer-token endpoint. Document the same `404` for malformed and unknown tokens so the endpoint does not reveal token state.
4. Regenerate `packages/api-client` with `mise run api:client:codegen`.

Do not keep a second JSON submission path. A multipart request without `file` preserves the user-visible no-attachment behavior without maintaining two contracts.

### 3. Enforce upload validation at the trust boundary

1. Ensure a route or server middleware caps the complete contact request before any multipart parser runs. Allow small multipart overhead above the 5 MiB file limit.
2. Parse and trim the existing fields, including a strict boolean parse for `ccSubleader`.
3. Accept a missing file, but reject an empty filename, empty content, or content larger than 5 MiB.
4. Detect MIME type from content with `http.DetectContentType`; do not trust the browser-provided `Content-Type`.
5. Start with an explicit allowlist suitable for proposals: PDF, Open XML Word/Excel/PowerPoint, and PNG/JPEG. Reject macro-enabled Office formats, archives, executables, and mismatches between the filename extension and detected content family.
6. Preserve the original filename as display metadata, but use the existing safe `Content-Disposition` helper for every download response.

The exact allowlist should be confirmed with the festival administration before implementation. Changing the allowlist should remain a small validation-table edit, not require a new configuration system.

### 4. Persist and send the contact

Refactor `submitContact` in `backend/internal/controllers/contact_profile.go` into small helpers for multipart binding, validation, persistence, and mail-body construction while preserving its current recipient rules.

1. Require a selected current circle for new contact records. Return the already documented `409` when no circle can be resolved.
2. Create the contact and optional attachment transactionally and obtain the raw download token only for mail construction.
3. Enqueue the participant confirmation first. Include the filename, but not the bearer URL.
4. Add the permanent download URL to the category-recipient email body, then enqueue that email.
5. If either enqueue operation fails before the link is distributed, delete the newly created contact and attachment. Preserve the current error response behavior.
6. Record `contact.submitted` only after the category-recipient email is accepted for enqueueing.

Use the configured application URL to build an absolute HTTPS link. Never include file bytes in `cloudflareemail.EmailJob`; `packages/email` should require no changes for this approach.

### 5. Serve downloads safely

1. Decode and hash the route token, then query by its digest using a constant-shape lookup.
2. Return the same `404` for malformed and unknown tokens.
3. Set `Content-Type` from the server-detected stored MIME type, `Content-Disposition: attachment` through `attachmentContentDisposition`, `X-Content-Type-Options: nosniff`, and a no-store cache policy.
4. Return the bytes without exposing contact, user, circle, or recipient metadata.

### 6. Update contact history

1. Make the new `contacts` table the source of truth for submissions created after this change.
2. Preserve visibility of legacy submissions by merging older `outbound_mails` entries that are not represented by a contact row. Keep this compatibility read path isolated and covered by a test.
3. Filter new history by both authenticated user and current circle rather than searching email body substrings.

This step fixes the current mismatch where the history implementation passes an empty circle ID and effectively returns the user's contacts across circles.

### 7. Update the Vue UI

1. Extend `frontend/src/pages/workspace/contact.vue` with an accessible file input using the existing form-field components.
2. Show the selected filename, formatted size, accepted formats, 5 MiB limit, and a remove action. Keep drag-and-drop out of the first version; the native file input covers the requirement with less code and better default accessibility.
3. Change `frontend/src/features/contact/api.ts` to build `FormData` and use the existing multipart request helper so the browser sets the boundary and the CSRF token remains present.
4. Disable controls while submitting, surface server validation errors for `file`, and clear the native input and reactive state after success.
5. Preserve submission without a file.

### 8. Add verification coverage

Backend and repository tests:

- authenticated multipart submission with and without a file;
- unauthenticated and invalid-CSRF rejection;
- no-current-circle `409`;
- empty, oversized, disallowed, extension/MIME-mismatched, and unsafe-filename cases;
- transactional rollback when persistence fails;
- attachment deletion when category-recipient enqueueing fails;
- token digest storage, successful download, indistinguishable malformed/unknown `404` cases, safe headers, and cascade deletion;
- history ownership by user and circle plus legacy-history compatibility.

Frontend tests:

- multipart fields and file contents sent correctly;
- no-file submission still works;
- selected-file metadata and removal;
- pending state and successful reset;
- client/server file validation messages;
- keyboard-accessible file selection.

Email tests:

- category-recipient body contains the permanent download link;
- confirmation body contains only the filename;
- raw bearer tokens and file bytes do not appear in logs or persisted mail metadata beyond the intended recipient body.

Run:

```bash
mise run backend:format
mise run backend:test
mise run backend:check
mise run api:client:codegen
mise run frontend:format
mise run frontend:check
cd frontend && pnpm test
mise run check
```

Use the repository's `ni`/`nr` aliases when running package scripts interactively; the command above mirrors the project-documented quality checks.

## Rollout and operations

- Confirm the extension/MIME allowlist with the festival administration before implementation.
- Monitor `contact_attachments` row count and total `octet_length(content)` after rollout.
- Document that anyone holding a link can download the file indefinitely and treat the URL as sensitive.
- Verify reverse-proxy request-size limits are above the application limit but not unbounded.
- Treat adding retention, explicit deletion, or moving blobs to object storage as follow-up work driven by measured volume.

## Out of scope

- Multiple attachments.
- Versioning.
- Drag-and-drop UI.
- Virus scanning or content disarm and reconstruction.
- Actual MIME email attachments.
- New object-storage infrastructure.
- A new staff contact-management UI.
- Refactoring unrelated email delivery consistency or the general outbound-mail status model.

## External constraints

- Cloudflare Queues message size limit: <https://developers.cloudflare.com/queues/platform/limits/>
- Cloudflare Email Service limits: <https://developers.cloudflare.com/email-service/platform/limits/>
