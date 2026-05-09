import { describe, expect, it } from 'vitest'
import {
  canAccessCircleMail,
  canAccessStaffCapability,
  canDeleteCircles,
  canDuplicateForms,
  canEditCircles,
  canEditContactCategories,
  canEditDocuments,
  canEditFormAnswers,
  canEditForms,
  canEditPages,
  canEditPermissions,
  canEditPlaces,
  canEditTags,
  canEditUsers,
  canExportDocuments,
  canExportFormAnswers,
  canExportForms,
  canExportPages,
  canManageParticipationTypes,
  canManagePortalSettings,
  canReadCircles,
  canReadContactCategories,
  canReadDocuments,
  canReadFormAnswers,
  canReadForms,
  canReadPages,
  canReadPermissions,
  canReadPlaces,
  canReadTags,
  canReadUsers,
  canSendCircleEmails,
  canSendPageEmails,
  canUseMailQueue,
  canUseStaffExports,
  canViewActivityLogs,
  hasStaffAccess
} from './capabilities'

describe('staff capabilities', () => {
  it('grants broad access to admin roles', () => {
    const roles = ['admin']

    expect(hasStaffAccess(roles)).toBe(true)
    expect(canReadUsers(roles)).toBe(true)
    expect(canEditUsers(roles)).toBe(true)
    expect(canReadPermissions(roles)).toBe(true)
    expect(canEditPermissions(roles)).toBe(true)
    expect(canReadCircles(roles)).toBe(true)
    expect(canEditCircles(roles)).toBe(true)
    expect(canDeleteCircles(roles)).toBe(true)
    expect(canSendCircleEmails(roles)).toBe(true)
    expect(canAccessCircleMail(roles)).toBe(true)
    expect(canManageParticipationTypes(roles)).toBe(true)
    expect(canReadPages(roles)).toBe(true)
    expect(canEditPages(roles)).toBe(true)
    expect(canExportPages(roles)).toBe(true)
    expect(canSendPageEmails(roles)).toBe(true)
    expect(canReadDocuments(roles)).toBe(true)
    expect(canEditDocuments(roles)).toBe(true)
    expect(canExportDocuments(roles)).toBe(true)
    expect(canReadForms(roles)).toBe(true)
    expect(canEditForms(roles)).toBe(true)
    expect(canExportForms(roles)).toBe(true)
    expect(canDuplicateForms(roles)).toBe(true)
    expect(canReadFormAnswers(roles)).toBe(true)
    expect(canEditFormAnswers(roles)).toBe(true)
    expect(canExportFormAnswers(roles)).toBe(true)
    expect(canReadTags(roles)).toBe(true)
    expect(canEditTags(roles)).toBe(true)
    expect(canReadPlaces(roles)).toBe(true)
    expect(canEditPlaces(roles)).toBe(true)
    expect(canReadContactCategories(roles)).toBe(true)
    expect(canEditContactCategories(roles)).toBe(true)
    expect(canUseStaffExports(roles)).toBe(true)
    expect(canUseMailQueue(roles)).toBe(true)
    expect(canViewActivityLogs(roles)).toBe(true)
    expect(canManagePortalSettings(roles)).toBe(true)
  })

  it('grants staff access when any permission starts with staff.', () => {
    expect(hasStaffAccess([], ['staff.documents.read'])).toBe(true)
    expect(hasStaffAccess([], ['participant.read'])).toBe(false)
  })

  it('distinguishes read and edit permissions for users and permissions', () => {
    expect(canReadUsers([], ['staff.users.read'])).toBe(true)
    expect(canEditUsers([], ['staff.users.read'])).toBe(false)
    expect(canEditUsers([], ['staff.users.read,edit'])).toBe(true)

    expect(canReadPermissions([], ['staff.permissions.read'])).toBe(true)
    expect(canEditPermissions([], ['staff.permissions.read'])).toBe(false)
    expect(canEditPermissions([], ['staff.permissions.read,edit'])).toBe(true)
  })

  it('distinguishes read, edit, delete, and mail permissions for circles', () => {
    expect(canReadCircles([], ['staff.circles.read'])).toBe(true)
    expect(canEditCircles([], ['staff.circles.read'])).toBe(false)
    expect(canDeleteCircles([], ['staff.circles.read,edit'])).toBe(false)
    expect(canEditCircles([], ['staff.circles.read,edit'])).toBe(true)
    expect(canDeleteCircles([], ['staff.circles.read,edit,delete'])).toBe(true)
    expect(canSendCircleEmails([], ['staff.circles.read,send_email'])).toBe(true)
    expect(canAccessCircleMail([], ['staff.circles.read,send_email'])).toBe(true)
    expect(canAccessCircleMail([], ['staff.circles.read'])).toBe(false)
    expect(canManageParticipationTypes([], ['staff.circles.participation_types'])).toBe(true)
  })

  it('maps content permissions to pages, documents, tags, places, and contacts', () => {
    expect(canReadPages([], ['staff.pages.read'])).toBe(true)
    expect(canEditPages([], ['staff.pages.read,edit'])).toBe(true)
    expect(canExportPages([], ['staff.pages.read,export'])).toBe(true)
    expect(canSendPageEmails([], ['staff.pages.read,edit,send_emails'])).toBe(true)

    expect(canReadDocuments([], ['staff.documents.read'])).toBe(true)
    expect(canEditDocuments([], ['staff.documents.read,edit'])).toBe(true)
    expect(canExportDocuments([], ['staff.documents.read,export'])).toBe(true)

    expect(canReadTags([], ['staff.tags.read'])).toBe(true)
    expect(canEditTags([], ['staff.tags.read,edit'])).toBe(true)

    expect(canReadPlaces([], ['staff.places.read'])).toBe(true)
    expect(canEditPlaces([], ['staff.places.read,edit'])).toBe(true)

    expect(canReadContactCategories([], ['staff.contacts.categories.read'])).toBe(true)
    expect(canEditContactCategories([], ['staff.contacts.categories.read,edit'])).toBe(true)
  })

  it('maps forms and exports permissions correctly', () => {
    expect(canReadForms([], ['staff.forms.read'])).toBe(true)
    expect(canEditForms([], ['staff.forms.read,edit'])).toBe(true)
    expect(canExportForms([], ['staff.forms.read,export'])).toBe(true)
    expect(canDuplicateForms([], ['staff.forms.read,edit,duplicate'])).toBe(true)

    expect(canReadFormAnswers([], ['staff.forms.answers.read'])).toBe(true)
    expect(canEditFormAnswers([], ['staff.forms.answers.read,edit'])).toBe(true)
    expect(canExportFormAnswers([], ['staff.forms.answers.read,export'])).toBe(true)

    expect(canUseStaffExports([], ['staff.pages.read,export'])).toBe(true)
    expect(canUseStaffExports([], ['staff.documents.read,export'])).toBe(true)
    expect(canUseStaffExports([], ['staff.forms.answers.read,export'])).toBe(true)
    expect(canUseMailQueue([], ['staff.pages.read,edit,send_emails'])).toBe(false)
  })

  it('resolves capability checks through the central dispatcher', () => {
    const roles = ['user_manager']
    const permissions = [
      'staff.pages.read,edit',
      'staff.pages.read,edit,send_emails',
      'staff.documents.read,export',
      'staff.forms.answers.read,export'
    ]

    expect(canAccessStaffCapability('users.read', roles, permissions)).toBe(true)
    expect(canAccessStaffCapability('users.edit', roles, permissions)).toBe(true)
    expect(canAccessStaffCapability('pages.edit', [], permissions)).toBe(true)
    expect(canAccessStaffCapability('documents.export', [], permissions)).toBe(true)
    expect(canAccessStaffCapability('formAnswers.export', [], permissions)).toBe(true)
    expect(canAccessStaffCapability('mailQueue.use', [], permissions)).toBe(false)
    expect(canAccessStaffCapability('portalSettings.manage', [], permissions)).toBe(false)
  })
})
