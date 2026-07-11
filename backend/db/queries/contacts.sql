-- name: CreateContact :one
INSERT INTO contacts (
    user_id,
    circle_id,
    category_id,
    category_name,
    subject,
    body,
    status,
    staff_mail_job_id
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, user_id, circle_id, category_id, category_name, subject, body, status, staff_mail_job_id, created_at;

-- name: CreateContactAttachment :one
INSERT INTO contact_attachments (
    contact_id,
    filename,
    mime_type,
    size_bytes,
    content,
    download_token_hash
) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, contact_id, filename, mime_type, size_bytes, content, download_token_hash, created_at;

-- name: ListContactsByOwner :many
SELECT
    contacts.id,
    contacts.user_id,
    contacts.circle_id,
    contacts.category_id,
    contacts.category_name,
    contacts.subject,
    contacts.body,
    contacts.status,
    contacts.staff_mail_job_id,
    contacts.created_at,
    contact_attachments.filename,
    contact_attachments.mime_type,
    contact_attachments.size_bytes
FROM contacts
LEFT JOIN contact_attachments ON contact_attachments.contact_id = contacts.id
WHERE contacts.user_id = $1 AND contacts.circle_id = $2
ORDER BY contacts.created_at DESC, contacts.id DESC;

-- name: FindContactAttachmentByTokenHash :one
SELECT id, contact_id, filename, mime_type, size_bytes, content, created_at
FROM contact_attachments
WHERE download_token_hash = $1;

-- name: DeleteContact :execrows
DELETE FROM contacts
WHERE id = $1;
