import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
    extractDeleteAccountValidationMessage,
    useDeleteOwnAccountMutation,
} from "@/features/session/deleteAccount";
import {
    extractPasswordValidationMessage,
    useUpdatePasswordMutation,
} from "@/features/session/password";
import {
    extractProfileValidationMessage,
    useUpdateProfileMutation,
} from "@/features/session/profile";
import { useSessionStore } from "@/features/session/store";
import { useUiThemePreference } from "@/features/session/theme";
import { hasStaffAccess } from "@/features/staff/access/capabilities";
import { buildUserSettingsTabs, type UserSettingsTab } from "@/features/ui/tabStrip";

export function useUserSettingsPage(activeTab: UserSettingsTab) {
    const route = useRoute();
    const router = useRouter();
    const sessionStore = useSessionStore();
    const updateProfileMutation = useUpdateProfileMutation();
    const updatePasswordMutation = useUpdatePasswordMutation();
    const deleteAccountMutation = useDeleteOwnAccountMutation();
    const { theme, setTheme } = useUiThemePreference();

    const tabs = computed(() => buildUserSettingsTabs(activeTab));
    const hasPrivilegedRole = computed(() =>
        hasStaffAccess(sessionStore.roles, sessionStore.permissions),
    );
    const belongsToCircle = computed(() => sessionStore.currentCircle !== null);
    const canDeleteAccountFromServer = computed(() => sessionStore.user?.canDeleteAccount === true);
    const canDeleteAccount = computed(() => canDeleteAccountFromServer.value);
    const deleteAccountBlockedReason = computed(() => {
        if (canDeleteAccountFromServer.value) {
            return "アカウントを削除した場合、申請の手続きなどができなくなります。";
        }
        if (hasPrivilegedRole.value) {
            return "管理者ユーザー・スタッフはアカウント削除できません。";
        }
        if (belongsToCircle.value) {
            return "企画に所属しているか、参加登録の途中のため、アカウント削除はできません。";
        }
        return "企画所属または権限状態のため、現在はアカウント削除できません。";
    });
    const forgotPasswordHref = computed(() => "/password/reset");
    const workspaceBackLink = computed(() => {
        if (route.path.startsWith("/workspace/settings")) {
            return "/workspace";
        }
        return "/";
    });

    async function deleteAccount() {
        if (!canDeleteAccount.value) {
            return null;
        }
        if (typeof window !== "undefined" && !window.confirm("本当にアカウントを削除しますか？")) {
            return null;
        }

        try {
            await deleteAccountMutation.mutateAsync();
            await router.replace("/");
            return null;
        } catch (error) {
            return extractDeleteAccountValidationMessage(error);
        }
    }

    return {
        tabs,
        theme,
        setTheme,
        sessionStore,
        updateProfileMutation,
        updatePasswordMutation,
        deleteAccountMutation,
        canDeleteAccount,
        deleteAccountBlockedReason,
        forgotPasswordHref,
        workspaceBackLink,
        extractProfileValidationMessage,
        extractPasswordValidationMessage,
        deleteAccount,
    };
}
