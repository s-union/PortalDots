import { http, HttpResponse } from 'msw'
import {
  mockSessionBootstrap,
  mockSessionBootstrapStaff,
  mockPublicConfig,
  mockPublicHome,
  mockPage,
  mockPageDetail,
  mockDocument,
  mockForm,
  mockCircle,
  mockTag,
  mockPlace,
  mockContactCategory,
  mockParticipationType,
  mockStaffCircle,
  mockStaffUser2,
  mockActivityLog,
  mockMail
} from './data'

const BASE = '/v1'

export const sessionHandlers = [
  http.get(`${BASE}/session/bootstrap`, () => HttpResponse.json(mockSessionBootstrap)),
  http.post(`${BASE}/auth/login`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 204 }))
]

export const sessionHandlersAuthenticated = [
  http.get(`${BASE}/session/bootstrap`, () => HttpResponse.json(mockSessionBootstrap)),
  http.post(`${BASE}/auth/login`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 204 }))
]

export const sessionHandlersStaff = [
  http.get(`${BASE}/session/bootstrap`, () => HttpResponse.json(mockSessionBootstrapStaff)),
  http.post(`${BASE}/auth/login`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 204 }))
]

export const publicHandlers = [
  http.get(`${BASE}/public/config`, () => HttpResponse.json(mockPublicConfig)),
  http.get(`${BASE}/public/home`, () => HttpResponse.json(mockPublicHome)),
  http.get(`${BASE}/public/pages`, () =>
    HttpResponse.json({
      items: [mockPage, { ...mockPage, id: 'page-2', title: '2つ目のお知らせ', isNew: false }],
      page: 1,
      pageSize: 10,
      total: 2
    })
  ),
  http.get(`${BASE}/public/pages/:pageID`, () => HttpResponse.json(mockPageDetail)),
  http.get(`${BASE}/public/documents`, () => HttpResponse.json([mockDocument]))
]

export const authHandlers = [
  http.post(`${BASE}/auth/register/start`, () => HttpResponse.json({ message: '確認メールを送信しました。' })),
  http.post(`${BASE}/auth/register/verify`, () =>
    HttpResponse.json({
      pendingRegistrationId: 'pending-1',
      univemail: 's12345678@example.ac.jp',
      studentId: 'S12345678',
      verified: true
    })
  ),
  http.post(`${BASE}/auth/register/complete`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${BASE}/auth/register`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${BASE}/auth/password/reset/start`, () =>
    HttpResponse.json({ message: 'パスワードリセットメールを送信しました。' })
  ),
  http.post(`${BASE}/auth/password/reset/verify`, () => HttpResponse.json({ userId: 'user-1', valid: true })),
  http.post(`${BASE}/auth/password/reset/complete`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${BASE}/auth/verification`, () =>
    HttpResponse.json({
      userId: 'user-1',
      displayName: '山田 太郎',
      completed: false,
      items: [
        { type: 'email', label: '連絡先メールアドレス', address: 'taro@example.com', verified: true },
        { type: 'univemail', label: '大学メール', address: 's12345678@example.ac.jp', verified: false }
      ]
    })
  ),
  http.post(`${BASE}/auth/verification/request`, () => HttpResponse.json({ message: '確認メールを送信しました。' })),
  http.post(`${BASE}/auth/verification/verify`, () => HttpResponse.json({ completed: true }))
]

export const circleHandlers = [
  http.get(`${BASE}/circles`, () =>
    HttpResponse.json([
      {
        id: 'circle-1',
        name: 'テストサークル',
        groupName: 'テストグループ',
        participationTypeName: '一般参加',
        submittedAt: null,
        status: 'pending'
      }
    ])
  ),
  http.get(`${BASE}/circles/current`, () => HttpResponse.json(mockCircle)),
  http.get(`${BASE}/circles/current/detail`, () => HttpResponse.json(mockCircle)),
  http.put(`${BASE}/circles/current`, () => HttpResponse.json(mockCircle)),
  http.get(`${BASE}/circles/current/members`, () =>
    HttpResponse.json([
      { userId: 'user-1', displayName: '山田 太郎', isLeader: true },
      { userId: 'user-2', displayName: '田中 花子', isLeader: false }
    ])
  ),
  http.post(`${BASE}/circles/current/members`, () => new HttpResponse(null, { status: 204 })),
  http.delete(`${BASE}/circles/current/members/:userID`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${BASE}/circles/current/submit`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${BASE}/circles/current/invitation-token/regenerate`, () =>
    HttpResponse.json({ invitationToken: 'new-token-xyz' })
  ),
  http.get(`${BASE}/circles/join/:token`, () => HttpResponse.json({ id: 'circle-1', name: 'テストサークル' })),
  http.post(`${BASE}/circles/join/:token`, () => new HttpResponse(null, { status: 204 }))
]

export const formsHandlers = [
  http.get(`${BASE}/forms`, () =>
    HttpResponse.json([mockForm, { ...mockForm, id: 'form-2', name: '第2回申請フォーム', hasAnswer: true }])
  ),
  http.get(`${BASE}/forms/:formID`, () =>
    HttpResponse.json({
      ...mockForm,
      currentCircleStatus: 'pending',
      questions: []
    })
  ),
  http.get(`${BASE}/forms/:formID/answer`, () => HttpResponse.json({ answer: null })),
  http.put(`${BASE}/forms/:formID/answer`, () => new HttpResponse(null, { status: 204 }))
]

export const pagesHandlers = [
  http.get(`${BASE}/pages`, () =>
    HttpResponse.json({
      items: [mockPage, { ...mockPage, id: 'page-2', title: '2つ目のお知らせ', isNew: false }],
      page: 1,
      pageSize: 10,
      total: 2
    })
  ),
  http.get(`${BASE}/pages/:pageID`, () => HttpResponse.json(mockPageDetail))
]

export const documentsHandlers = [
  http.get(`${BASE}/documents`, () =>
    HttpResponse.json([mockDocument, { ...mockDocument, id: 'doc-2', name: '重要資料.pdf', isImportant: true }])
  )
]

export const contactHandlers = [
  http.get(`${BASE}/contact-categories`, () => HttpResponse.json([mockContactCategory])),
  http.post(`${BASE}/contact`, () => new HttpResponse(null, { status: 204 }))
]

export const participationTypeHandlers = [
  http.get(`${BASE}/participation-types`, () => HttpResponse.json([mockParticipationType])),
  http.get(`${BASE}/participation-types/:typeID/registration-form`, () => HttpResponse.json(mockParticipationType.form))
]

export const staffHandlers = [
  http.get(`${BASE}/staff/circles`, () =>
    HttpResponse.json({
      items: [mockStaffCircle, { ...mockStaffCircle, id: 'circle-2', name: 'サークルB', status: 'approved' }],
      page: 1,
      pageSize: 20,
      total: 2
    })
  ),
  http.get(`${BASE}/staff/circles/all`, () => HttpResponse.json([mockStaffCircle])),
  http.get(`${BASE}/staff/circles/managed`, () => HttpResponse.json([{ id: 'circle-1', name: 'テストサークル' }])),
  http.get(`${BASE}/staff/circles/:circleID`, () => HttpResponse.json(mockStaffCircle)),
  http.put(`${BASE}/staff/circles/:circleID`, () => HttpResponse.json(mockStaffCircle)),
  http.get(`${BASE}/staff/circles/:circleID/members`, () =>
    HttpResponse.json([
      { userId: 'user-1', displayName: '山田 太郎', loginIds: ['s12345678@example.ac.jp'], isLeader: true },
      { userId: 'user-2', displayName: '田中 花子', loginIds: ['s99999999@example.ac.jp'], isLeader: false }
    ])
  ),
  http.delete(`${BASE}/staff/circles/:circleID/members/:userID`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${BASE}/staff/circles/:circleID/email`, () =>
    HttpResponse.json({
      circle: mockStaffCircle,
      recipients: [{ id: 'user-1', displayName: '山田 太郎', loginIds: ['s12345678@example.ac.jp'] }]
    })
  ),
  http.get(`${BASE}/staff/forms`, () =>
    HttpResponse.json([
      {
        circle: { id: '', name: '' },
        ...mockForm,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        isParticipationForm: false
      },
      {
        circle: { id: 'circle-1', name: 'テストサークル' },
        ...mockForm,
        id: 'form-2',
        name: '個別フォーム',
        isParticipationForm: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      }
    ])
  ),
  http.get(`${BASE}/staff/forms/:formID`, () =>
    HttpResponse.json({
      circle: { id: '', name: '' },
      ...mockForm,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      isParticipationForm: false,
      questions: [],
      answer: null
    })
  ),
  http.post(`${BASE}/staff/forms/:formID/copy`, () =>
    HttpResponse.json({
      circle: { id: '', name: '' },
      ...mockForm,
      id: 'form-copy',
      name: `${mockForm.name} コピー`,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      isParticipationForm: false
    })
  ),
  http.delete(`${BASE}/staff/forms/:formID`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${BASE}/staff/forms/:formID/preview`, () =>
    HttpResponse.json({
      id: 'form-1',
      name: 'テスト申請フォーム',
      description: 'テスト用の申請フォームです。',
      openAt: '2026-01-01T00:00:00Z',
      closeAt: '2026-12-31T23:59:59Z',
      answerableTags: [],
      confirmationMessage: '申請が完了しました。',
      isPublic: true,
      isOpen: true,
      maxAnswers: 1,
      questions: []
    })
  ),
  http.get(`${BASE}/staff/forms/:formID/questions`, () => HttpResponse.json([])),
  http.get(`${BASE}/staff/pages`, () =>
    HttpResponse.json({
      items: [
        {
          ...mockPageDetail,
          notes: '',
          isPinned: false,
          isPublic: true,
          viewableTags: [],
          documentIds: [],
          documents: []
        }
      ],
      page: 1,
      pageSize: 20,
      total: 1
    })
  ),
  http.get(`${BASE}/staff/pages/:pageID`, () =>
    HttpResponse.json({
      ...mockPageDetail,
      notes: '',
      isPinned: false,
      isPublic: true,
      viewableTags: [],
      documentIds: [],
      documents: []
    })
  ),
  http.get(`${BASE}/staff/documents`, () =>
    HttpResponse.json({
      items: [
        {
          circle: { id: '', name: '' },
          ...mockDocument,
          notes: '',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          isPublic: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-15T12:00:00Z'
        }
      ],
      page: 1,
      pageSize: 20,
      total: 1
    })
  ),
  http.get(`${BASE}/staff/users`, () =>
    HttpResponse.json({
      items: [mockStaffUser2],
      page: 1,
      pageSize: 20,
      total: 1
    })
  ),
  http.get(`${BASE}/staff/users/:userId`, () => HttpResponse.json(mockStaffUser2)),
  http.get(`${BASE}/staff/permissions`, () =>
    HttpResponse.json({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0
    })
  ),
  http.get(`${BASE}/staff/permissions/:userId`, () =>
    HttpResponse.json({
      user: {
        id: 'user-1',
        displayName: '山田 太郎',
        loginIds: ['s12345678@example.ac.jp'],
        roles: [],
        permissions: [],
        isEditable: true
      },
      definedPermissions: [],
      assignedPermissionNames: []
    })
  ),
  http.get(`${BASE}/staff/participation-types`, () =>
    HttpResponse.json([
      {
        id: 'type-1',
        name: '一般参加',
        description: '一般的な参加形式です。',
        usersCountMin: 1,
        usersCountMax: 10,
        tags: [],
        form: mockParticipationType.form
      }
    ])
  ),
  http.get(`${BASE}/staff/activity-logs`, () =>
    HttpResponse.json({
      items: [mockActivityLog],
      page: 1,
      pageSize: 20,
      total: 1
    })
  ),
  http.get(`${BASE}/staff/mails`, () =>
    HttpResponse.json({
      items: [mockMail],
      page: 1,
      pageSize: 20,
      total: 1
    })
  ),
  http.get(`${BASE}/staff/mail/:mailId`, () => HttpResponse.json(mockMail)),
  http.get(`${BASE}/staff/tags`, () =>
    HttpResponse.json({
      items: [mockTag],
      page: 1,
      pageSize: 20,
      total: 1
    })
  ),
  http.get(`${BASE}/staff/places`, () =>
    HttpResponse.json({
      items: [mockPlace],
      page: 1,
      pageSize: 20,
      total: 1
    })
  ),
  http.get(`${BASE}/staff/contact-categories`, () =>
    HttpResponse.json({
      items: [mockContactCategory],
      page: 1,
      pageSize: 20,
      total: 1
    })
  ),
  http.get(`${BASE}/staff/settings`, () =>
    HttpResponse.json({
      appName: 'PortalDots',
      portalDescription: 'テスト大学 学園祭実行委員会のポータルシステムです。',
      appUrl: 'https://example.com',
      appForceHttps: false,
      portalAdminName: 'テスト大学 学園祭実行委員会',
      portalContactEmail: 'contact@example.com',
      portalUnivemailLocalPart: 'student',
      portalUnivemailDomainPart: 'example.ac.jp',
      portalStudentIdName: '学籍番号',
      portalUnivemailName: '大学メール',
      portalPrimaryColorH: 220,
      portalPrimaryColorS: 80,
      portalPrimaryColorL: 50
    })
  ),
  http.get(`${BASE}/staff/status`, () => HttpResponse.json({ allowed: true, authorized: true }))
]

export const defaultHandlers = [
  ...sessionHandlers,
  ...publicHandlers,
  ...authHandlers,
  ...circleHandlers,
  ...formsHandlers,
  ...pagesHandlers,
  ...documentsHandlers,
  ...contactHandlers,
  ...participationTypeHandlers,
  ...staffHandlers
]
