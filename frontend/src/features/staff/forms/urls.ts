import { buildApiUrl } from '@/lib/api/client'

export function buildStaffFormUploadDownloadUrl(formId: string, uploadId: string) {
  return buildApiUrl(`/staff/forms/${encodeURIComponent(formId)}/uploads/${encodeURIComponent(uploadId)}/file`)
}

export function buildStaffFormsExportUrl() {
  return buildApiUrl('/staff/forms/export')
}
