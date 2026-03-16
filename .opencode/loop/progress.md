# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->

- 2026-03-16: 新しい移植ループでは breadth を優先し、legacy route と migrated sibling 差分をまとめて backlog 化してから小粒の静的ページ・導線・テスト不足を順に潰すと途切れず回しやすい。
- 2026-03-16: 直近の未移行ギャップは public auth 系の案内止まり、staff の静的補助ページ、staff forms/pages の sibling テスト不足、staff mails/send_emails 導線のずれに集中している。
- 2026-03-16: static な legacy 補助ページは runtime 依存まで無理に移さず、まず Vue の file-based route で概要・導線・早見表を復元する方が安全。`staff/index` と `staff/settings` の両方に入口を足し、単体テストで文言を固定すると後の整理もしやすい。
- 2026-03-16: legacy の `/staff/forms/{form}/not_answered` は新 API を増やさなくても `useStaffFormAnswersIndexQuery()` の `notAnsweredCircles` を再利用して復元できる。answers index から専用画面へのリンクを足すだけで一覧画面の圧迫も減らせる。
- 2026-03-16: staff の legacy URL 救済は participant 向けと同じく `frontend/src/pages/[...all].vue` に集約すると file-based route の増殖を防げる。`/staff/send_emails` のような旧管理導線も、移行先画面への案内と補助リンクを 1 枚で出すだけで十分実用的。
- 2026-03-16: staff の CRUD detail テストは `documents/[documentId]/edit.test.ts` を雛形にすると速い。detail GET に加えて update / pin toggle / delete の mutation を 1 テストでまとめて固定すると sibling 間の回帰差が減る。
- 2026-03-16: `staff/forms/[formId]` 配下の sibling 画面テストは、`/staff/status` と対象画面の GET だけを最小 stub すると十分固定できる。`answers/uploads` の ZIP 導線は `buildStaffFormAnswerUploadsZipUrl()` の生成結果まで anchor href で確認しておくと URL 退行も拾いやすい。
