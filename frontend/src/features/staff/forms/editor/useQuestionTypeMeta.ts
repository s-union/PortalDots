import type { allowedQuestionTypes } from '@/features/staff/forms/api'

export type AllowedQuestionType = (typeof allowedQuestionTypes)[number]

export interface QuestionTypeMeta {
  label: string
  icon: string
}

export const QUESTION_TYPE_META: Record<AllowedQuestionType, QuestionTypeMeta> = {
  heading: { label: 'セクション見出し', icon: 'H' },
  text: { label: '一行入力', icon: '≡' },
  number: { label: '整数入力', icon: '#' },
  textarea: { label: '複数行入力', icon: '☰' },
  radio: { label: '単一選択（ラジオボタン）', icon: '◉' },
  select: { label: '単一選択（ドロップダウン）', icon: '▼' },
  checkbox: { label: '複数選択（チェックボックス）', icon: '☑' },
  upload: { label: 'ファイルアップロード', icon: '📄' }
}

function isAllowedQuestionType(type: string): type is AllowedQuestionType {
  return type in QUESTION_TYPE_META
}

export function getQuestionTypeMeta(type: string): QuestionTypeMeta {
  if (isAllowedQuestionType(type)) {
    return QUESTION_TYPE_META[type]
  }
  return { label: type, icon: '?' }
}
