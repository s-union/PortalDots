import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'
import {
  createEditableLoginIds,
  createEditableRoles,
  extractStaffUserValidationMessage,
  formatStaffUserLoginIds,
  normalizeSelectedRoles,
  parseStaffUserLoginIds,
  useDeleteStaffUserMutation,
  useStaffUserDetailQuery,
  useUpdateStaffUserMutation,
  useUpdateStaffUserRolesMutation,
  useVerifyStaffUserMutation
} from '@/features/staff/users/api'

export function useStaffUserEditor(
  userId: MaybeRefOrGetter<string>,
  options?: { onSaved?: () => void; onDeleted?: () => void }
) {
  const { enabled } = useAuthorizedStaffContext({ capability: 'users.edit' })
  const userQuery = useStaffUserDetailQuery(
    computed(() => toValue(userId)),
    enabled
  )
  const updateUserMutation = useUpdateStaffUserMutation()
  const updateRolesMutation = useUpdateStaffUserRolesMutation()
  const verifyUserMutation = useVerifyStaffUserMutation(computed(() => toValue(userId)))
  const deleteUserMutation = useDeleteStaffUserMutation(computed(() => toValue(userId)))
  const editableRoles = createEditableRoles([])
  const loginIdsText = createEditableLoginIds([])
  const lastName = ref('')
  const lastNameReading = ref('')
  const firstName = ref('')
  const firstNameReading = ref('')
  const displayName = ref('')
  const contactEmail = ref('')
  const phoneNumber = ref('')
  const errorMessage = ref('')
  const successMessage = ref('')

  watch(
    () => userQuery.data.value,
    (user) => {
      if (!user) {
        return
      }

      lastName.value = user.lastName
      lastNameReading.value = user.lastNameReading
      firstName.value = user.firstName
      firstNameReading.value = user.firstNameReading
      displayName.value = user.displayName
      loginIdsText.value = formatStaffUserLoginIds(user.loginIds)
      contactEmail.value = user.contactEmail
      phoneNumber.value = user.phoneNumber
      editableRoles.value = [...user.roles]
      errorMessage.value = ''
      successMessage.value = ''
    },
    { immediate: true }
  )

  async function saveUser() {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const updatedUser = await updateUserMutation.mutateAsync({
        userId: toValue(userId),
        lastName: lastName.value,
        lastNameReading: lastNameReading.value,
        firstName: firstName.value,
        firstNameReading: firstNameReading.value,
        displayName: displayName.value,
        loginIds: parseStaffUserLoginIds(loginIdsText.value),
        contactEmail: contactEmail.value,
        phoneNumber: phoneNumber.value
      })
      lastName.value = updatedUser.lastName
      lastNameReading.value = updatedUser.lastNameReading
      firstName.value = updatedUser.firstName
      firstNameReading.value = updatedUser.firstNameReading
      displayName.value = updatedUser.displayName
      loginIdsText.value = formatStaffUserLoginIds(updatedUser.loginIds)
      contactEmail.value = updatedUser.contactEmail
      phoneNumber.value = updatedUser.phoneNumber
      successMessage.value = 'ユーザー情報を更新しました。'
      options?.onSaved?.()
    } catch (error) {
      errorMessage.value = extractStaffUserValidationMessage(error)
    }
  }

  async function saveRoles() {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const updatedUser = await updateRolesMutation.mutateAsync({
        userId: toValue(userId),
        roles: normalizeSelectedRoles(editableRoles.value)
      })
      editableRoles.value = [...updatedUser.roles]
      successMessage.value = 'ロールを更新しました。'
      options?.onSaved?.()
    } catch (error) {
      errorMessage.value = extractStaffUserValidationMessage(error)
    }
  }

  async function verifyUser() {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      await verifyUserMutation.mutateAsync()
      successMessage.value = '本人確認を完了しました。'
      options?.onSaved?.()
    } catch (error) {
      errorMessage.value = extractStaffUserValidationMessage(error)
    }
  }

  async function deleteUser() {
    if (typeof window !== 'undefined' && !window.confirm('このユーザーを削除しますか？')) {
      return
    }

    errorMessage.value = ''
    successMessage.value = ''

    try {
      await deleteUserMutation.mutateAsync()
      options?.onDeleted?.()
    } catch (error) {
      errorMessage.value = extractStaffUserValidationMessage(error)
    }
  }

  function isRoleChecked(role: string) {
    return editableRoles.value.includes(role)
  }

  function toggleRole(role: string, checked: boolean) {
    if (checked) {
      if (!editableRoles.value.includes(role)) {
        editableRoles.value = [...editableRoles.value, role]
      }
      return
    }

    editableRoles.value = editableRoles.value.filter((currentRole) => currentRole !== role)
  }

  function handleRoleChange(event: Event, role: string) {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) {
      return
    }

    toggleRole(role, target.checked)
  }

  return {
    contactEmail,
    deleteUser,
    deleteUserMutation,
    displayName,
    editableRoles,
    errorMessage,
    firstName,
    firstNameReading,
    handleRoleChange,
    isRoleChecked,
    lastName,
    lastNameReading,
    loginIdsText,
    phoneNumber,
    saveRoles,
    saveUser,
    successMessage,
    updateRolesMutation,
    updateUserMutation,
    userQuery,
    verifyUser,
    verifyUserMutation
  }
}
