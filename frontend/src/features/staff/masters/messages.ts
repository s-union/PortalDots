export function buildDeleteStaffTagConfirmMessage(tagName: string) {
  return `本当に「${tagName}」タグを削除しますか？\n\n• 企画に紐付いている「${tagName}」タグは解除されます。企画自体は削除されません\n• お知らせの閲覧タグから「${tagName}」が外れ、このタグだけを指定していたお知らせは全ユーザー公開になります\n• 申請フォームの回答可能タグから「${tagName}」が外れ、このタグだけを指定していたフォームは全企画が回答可能になります`
}
