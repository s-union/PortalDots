export type StaffCapability =
    | "users.read"
    | "users.edit"
    | "permissions.read"
    | "permissions.edit"
    | "circles.read"
    | "circles.edit"
    | "circles.participationTypes"
    | "pages.read"
    | "pages.edit"
    | "pages.delete"
    | "pages.export"
    | "pages.sendEmails"
    | "documents.read"
    | "documents.edit"
    | "documents.delete"
    | "documents.export"
    | "forms.read"
    | "forms.edit"
    | "forms.delete"
    | "forms.export"
    | "forms.duplicate"
    | "formAnswers.read"
    | "formAnswers.edit"
    | "formAnswers.delete"
    | "formAnswers.export"
    | "tags.read"
    | "tags.edit"
    | "tags.delete"
    | "places.read"
    | "places.edit"
    | "places.delete"
    | "contactCategories.read"
    | "contactCategories.edit"
    | "contactCategories.delete"
    | "mailQueue.use"
    | "exports.use"
    | "activityLogs.read"
    | "portalSettings.manage";

function hasAnyRole(roles: string[], ...candidates: string[]) {
    return roles.some((role) => candidates.includes(role));
}

function hasAnyPermission(permissions: string[], ...candidates: string[]) {
    return permissions.some((permission) => candidates.includes(permission));
}

export function hasStaffAccess(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(
            roles,
            "admin",
            "content_manager",
            "forms_manager",
            "circle_manager",
            "user_manager",
        ) || permissions.some((permission) => permission.startsWith("staff."))
    );
}

export function canReadUsers(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "user_manager") ||
        hasAnyPermission(
            permissions,
            "staff.users",
            "staff.users.read,export",
            "staff.users.read,edit",
            "staff.users.read",
        )
    );
}

export function canEditUsers(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "user_manager") ||
        hasAnyPermission(permissions, "staff.users", "staff.users.read,edit")
    );
}

export function canReadPermissions(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin") ||
        hasAnyPermission(
            permissions,
            "staff.permissions",
            "staff.permissions.read,edit",
            "staff.permissions.read",
        )
    );
}

export function canEditPermissions(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin") ||
        hasAnyPermission(permissions, "staff.permissions", "staff.permissions.read,edit")
    );
}

export function canReadCircles(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "circle_manager") ||
        hasAnyPermission(
            permissions,
            "staff.circles",
            "staff.circles.read,edit,delete",
            "staff.circles.read,edit",
            "staff.circles.read,send_email",
            "staff.circles.read,export",
            "staff.circles.read",
        )
    );
}

export function canEditCircles(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "circle_manager") ||
        hasAnyPermission(
            permissions,
            "staff.circles",
            "staff.circles.read,edit,delete",
            "staff.circles.read,edit",
        )
    );
}

export function canManageParticipationTypes(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "circle_manager") ||
        hasAnyPermission(permissions, "staff.circles", "staff.circles.participation_types")
    );
}

export function canReadPages(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(
            permissions,
            "staff.pages",
            "staff.pages.read,edit,delete",
            "staff.pages.read,edit,send_emails",
            "staff.pages.read,edit",
            "staff.pages.read,export",
            "staff.pages.read",
        )
    );
}

export function canEditPages(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(
            permissions,
            "staff.pages",
            "staff.pages.read,edit,delete",
            "staff.pages.read,edit,send_emails",
            "staff.pages.read,edit",
        )
    );
}

export function canDeletePages(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(permissions, "staff.pages", "staff.pages.read,edit,delete")
    );
}

export function canExportPages(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(permissions, "staff.pages", "staff.pages.read,export")
    );
}

export function canSendPageEmails(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(permissions, "staff.pages", "staff.pages.read,edit,send_emails")
    );
}

export function canReadDocuments(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(
            permissions,
            "staff.documents",
            "staff.documents.read,edit,delete",
            "staff.documents.read,edit",
            "staff.documents.read,export",
            "staff.documents.read",
        )
    );
}

export function canEditDocuments(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(
            permissions,
            "staff.documents",
            "staff.documents.read,edit,delete",
            "staff.documents.read,edit",
        )
    );
}

export function canDeleteDocuments(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(permissions, "staff.documents", "staff.documents.read,edit,delete")
    );
}

export function canExportDocuments(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(permissions, "staff.documents", "staff.documents.read,export")
    );
}

export function canReadForms(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "forms_manager") ||
        hasAnyPermission(
            permissions,
            "staff.forms",
            "staff.forms.read,edit,delete",
            "staff.forms.read,edit,duplicate",
            "staff.forms.read,edit",
            "staff.forms.read,export",
            "staff.forms.read",
        )
    );
}

export function canEditForms(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "forms_manager") ||
        hasAnyPermission(
            permissions,
            "staff.forms",
            "staff.forms.read,edit,delete",
            "staff.forms.read,edit,duplicate",
            "staff.forms.read,edit",
        )
    );
}

export function canDeleteForms(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "forms_manager") ||
        hasAnyPermission(permissions, "staff.forms", "staff.forms.read,edit,delete")
    );
}

export function canExportForms(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "forms_manager") ||
        hasAnyPermission(permissions, "staff.forms", "staff.forms.read,export")
    );
}

export function canDuplicateForms(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "forms_manager") ||
        hasAnyPermission(permissions, "staff.forms", "staff.forms.read,edit,duplicate")
    );
}

export function canReadFormAnswers(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "forms_manager") ||
        hasAnyPermission(
            permissions,
            "staff.forms.answers.read,edit,delete",
            "staff.forms.answers.read,edit",
            "staff.forms.answers.read,export",
            "staff.forms.answers.read",
        )
    );
}

export function canEditFormAnswers(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "forms_manager") ||
        hasAnyPermission(
            permissions,
            "staff.forms.answers.read,edit,delete",
            "staff.forms.answers.read,edit",
        )
    );
}

export function canDeleteFormAnswers(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "forms_manager") ||
        hasAnyPermission(permissions, "staff.forms.answers.read,edit,delete")
    );
}

export function canExportFormAnswers(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "forms_manager") ||
        hasAnyPermission(permissions, "staff.forms.answers.read,export")
    );
}

export function canReadTags(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(
            permissions,
            "staff.tags",
            "staff.tags.read,edit,delete",
            "staff.tags.read,edit",
            "staff.tags.read,export",
            "staff.tags.read",
        )
    );
}

export function canEditTags(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(
            permissions,
            "staff.tags",
            "staff.tags.read,edit,delete",
            "staff.tags.read,edit",
        )
    );
}

export function canDeleteTags(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(permissions, "staff.tags", "staff.tags.read,edit,delete")
    );
}

export function canReadPlaces(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(
            permissions,
            "staff.places",
            "staff.places.read,edit,delete",
            "staff.places.read,edit",
            "staff.places.read,export",
            "staff.places.read",
        )
    );
}

export function canEditPlaces(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(
            permissions,
            "staff.places",
            "staff.places.read,edit,delete",
            "staff.places.read,edit",
        )
    );
}

export function canDeletePlaces(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(permissions, "staff.places", "staff.places.read,edit,delete")
    );
}

export function canReadContactCategories(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(
            permissions,
            "staff.contacts",
            "staff.contacts.categories.read,edit,delete",
            "staff.contacts.categories.read,edit",
            "staff.contacts.categories.read",
        )
    );
}

export function canEditContactCategories(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(
            permissions,
            "staff.contacts",
            "staff.contacts.categories.read,edit,delete",
            "staff.contacts.categories.read,edit",
        )
    );
}

export function canDeleteContactCategories(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(
            permissions,
            "staff.contacts",
            "staff.contacts.categories.read,edit,delete",
        )
    );
}

export function canUseMailQueue(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager") ||
        hasAnyPermission(permissions, "staff.pages", "staff.pages.read,edit,send_emails")
    );
}

export function canUseStaffExports(roles: string[], permissions: string[] = []) {
    return (
        hasAnyRole(roles, "admin", "content_manager", "forms_manager") ||
        hasAnyPermission(
            permissions,
            "staff.pages",
            "staff.pages.read,export",
            "staff.documents",
            "staff.documents.read,export",
            "staff.forms",
            "staff.forms.read,export",
            "staff.forms.answers.read,export",
        )
    );
}

export function canViewActivityLogs(roles: string[], _permissions: string[] = []) {
    return hasAnyRole(roles, "admin");
}

export function canManagePortalSettings(roles: string[], _permissions: string[] = []) {
    return hasAnyRole(roles, "admin");
}

export function canManageUsers(roles: string[], permissions: string[] = []) {
    return canReadUsers(roles, permissions);
}

export function canManagePermissions(roles: string[], permissions: string[] = []) {
    return canReadPermissions(roles, permissions);
}

export function canManageCircles(roles: string[], permissions: string[] = []) {
    return canReadCircles(roles, permissions);
}

export function canAccessStaffCapability(
    capability: StaffCapability,
    roles: string[],
    permissions: string[] = [],
) {
    switch (capability) {
        case "users.read":
            return canReadUsers(roles, permissions);
        case "users.edit":
            return canEditUsers(roles, permissions);
        case "permissions.read":
            return canReadPermissions(roles, permissions);
        case "permissions.edit":
            return canEditPermissions(roles, permissions);
        case "circles.read":
            return canReadCircles(roles, permissions);
        case "circles.edit":
            return canEditCircles(roles, permissions);
        case "circles.participationTypes":
            return canManageParticipationTypes(roles, permissions);
        case "pages.read":
            return canReadPages(roles, permissions);
        case "pages.edit":
            return canEditPages(roles, permissions);
        case "pages.delete":
            return canDeletePages(roles, permissions);
        case "pages.export":
            return canExportPages(roles, permissions);
        case "pages.sendEmails":
            return canSendPageEmails(roles, permissions);
        case "documents.read":
            return canReadDocuments(roles, permissions);
        case "documents.edit":
            return canEditDocuments(roles, permissions);
        case "documents.delete":
            return canDeleteDocuments(roles, permissions);
        case "documents.export":
            return canExportDocuments(roles, permissions);
        case "forms.read":
            return canReadForms(roles, permissions);
        case "forms.edit":
            return canEditForms(roles, permissions);
        case "forms.delete":
            return canDeleteForms(roles, permissions);
        case "forms.export":
            return canExportForms(roles, permissions);
        case "forms.duplicate":
            return canDuplicateForms(roles, permissions);
        case "formAnswers.read":
            return canReadFormAnswers(roles, permissions);
        case "formAnswers.edit":
            return canEditFormAnswers(roles, permissions);
        case "formAnswers.delete":
            return canDeleteFormAnswers(roles, permissions);
        case "formAnswers.export":
            return canExportFormAnswers(roles, permissions);
        case "tags.read":
            return canReadTags(roles, permissions);
        case "tags.edit":
            return canEditTags(roles, permissions);
        case "tags.delete":
            return canDeleteTags(roles, permissions);
        case "places.read":
            return canReadPlaces(roles, permissions);
        case "places.edit":
            return canEditPlaces(roles, permissions);
        case "places.delete":
            return canDeletePlaces(roles, permissions);
        case "contactCategories.read":
            return canReadContactCategories(roles, permissions);
        case "contactCategories.edit":
            return canEditContactCategories(roles, permissions);
        case "contactCategories.delete":
            return canDeleteContactCategories(roles, permissions);
        case "mailQueue.use":
            return canUseMailQueue(roles, permissions);
        case "exports.use":
            return canUseStaffExports(roles, permissions);
        case "activityLogs.read":
            return canViewActivityLogs(roles, permissions);
        case "portalSettings.manage":
            return canManagePortalSettings(roles, permissions);
    }
}
