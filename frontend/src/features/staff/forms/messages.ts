export function buildCopyStaffFormConfirmMessage(formName: string) {
  return `フォーム「${formName}」を複製しますか？\n\n• 設問は全て複製されます\n• 「${formName}のコピー」という名前のフォームが作成されます\n• 「${formName}のコピー」は非公開です。後から必要に応じて設定を変更してください`
}

export function buildDeleteStaffFormConfirmMessage(formName: string) {
  return `フォーム「${formName}」を削除しますか？\n\n• 設問、回答は全て削除されます`
}
