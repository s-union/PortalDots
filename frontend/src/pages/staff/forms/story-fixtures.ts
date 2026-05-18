export const staffFormStoryQuestions = [
  {
    id: 'question-heading',
    name: '展示内容',
    description: '来場者に公開する内容を確認します。',
    type: 'heading',
    isRequired: false,
    numberMin: null,
    numberMax: null,
    allowedTypes: '',
    options: [],
    priority: 1,
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z'
  },
  {
    id: 'question-responsible',
    name: '当日責任者',
    description: '当日連絡が取れる責任者名を入力してください。',
    type: 'text',
    isRequired: true,
    numberMin: null,
    numberMax: null,
    allowedTypes: '',
    options: [],
    priority: 2,
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z'
  },
  {
    id: 'question-equipment',
    name: '使用機材',
    description: '使用予定の機材を選択してください。',
    type: 'checkbox',
    isRequired: false,
    numberMin: null,
    numberMax: null,
    allowedTypes: '',
    options: ['長机', '椅子', '電源', '暗幕'],
    priority: 3,
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z'
  },
  {
    id: 'question-power',
    name: '希望電源口数',
    description: '必要な電源口数を入力してください。',
    type: 'number',
    isRequired: true,
    numberMin: 0,
    numberMax: 8,
    allowedTypes: '',
    options: [],
    priority: 4,
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z'
  },
  {
    id: 'question-layout',
    name: 'レイアウト資料',
    description: '配置図や参考資料があればアップロードしてください。',
    type: 'upload',
    isRequired: false,
    numberMin: null,
    numberMax: null,
    allowedTypes: '.pdf,.png,.jpg',
    options: [],
    priority: 5,
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z'
  }
]

export const staffFormStoryDetail = {
  circle: { id: 'circle-b', name: 'デモ企画B' },
  id: 'form-circle-b-1',
  name: '展示チェックフォーム',
  description: '展示レイアウトと機材使用申請を提出してください。',
  openAt: '2026-03-02T00:00:00Z',
  closeAt: '2026-03-22T23:59:59Z',
  maxAnswers: 2,
  answerableTags: ['展示', '屋内'],
  confirmationMessage: '回答ありがとうございました。内容を確認して必要に応じて連絡します。',
  isPublic: true,
  isOpen: true,
  createdAt: '2026-03-01T12:00:00Z',
  updatedAt: '2026-03-08T09:30:00Z',
  isParticipationForm: false,
  questions: staffFormStoryQuestions,
  answer: null
}

export const staffFormStoryCircles = [
  {
    id: 'circle-a',
    name: '珈琲研究会',
    groupName: '珈琲研究会',
    participationTypeName: '展示'
  },
  {
    id: 'circle-b',
    name: '写真部',
    groupName: '写真部',
    participationTypeName: '展示'
  },
  {
    id: 'circle-c',
    name: '軽音サークル',
    groupName: '軽音サークル',
    participationTypeName: 'ステージ'
  }
]

export const staffFormStoryAnswers = [
  {
    id: 'answer-1',
    circle: staffFormStoryCircles[0],
    body: '展示位置は正面入口側を希望します。電源を使用します。',
    createdAt: '2026-03-06T11:20:00Z',
    updatedAt: '2026-03-08T09:30:00Z',
    uploadCount: 1,
    details: {
      'question-responsible': ['佐藤 花子'],
      'question-equipment': ['長机', '電源'],
      'question-power': ['2'],
      'question-layout': ['layout-coffee.pdf']
    }
  },
  {
    id: 'answer-2',
    circle: staffFormStoryCircles[1],
    body: '壁面展示を予定しています。暗幕の利用可否を確認したいです。',
    createdAt: '2026-03-07T14:15:00Z',
    updatedAt: '2026-03-07T18:40:00Z',
    uploadCount: 0,
    details: {
      'question-responsible': ['田中 一郎'],
      'question-equipment': ['椅子', '暗幕'],
      'question-power': ['0'],
      'question-layout': []
    }
  }
]

export const staffFormStoryAnswersIndex = {
  form: staffFormStoryDetail,
  answers: staffFormStoryAnswers,
  circles: staffFormStoryCircles,
  notAnsweredCircles: [staffFormStoryCircles[2]]
}
