import { buildApiUrl } from '@/lib/api/client'

export function buildStaffPlacesExportUrl() {
  return buildApiUrl('/staff/places/export')
}
