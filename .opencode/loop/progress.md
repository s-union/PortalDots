# Loop Progress

## Patterns & Notes
<!-- Append important discoveries, pitfalls, and workarounds as you work -->

- 2026-03-16: 新しい移植ループでは breadth を優先し、legacy route と migrated sibling 差分をまとめて backlog 化してから小粒の静的ページ・導線・テスト不足を順に潰すと途切れず回しやすい。
- 2026-03-16: 直近の未移行ギャップは public auth 系の案内止まり、staff の静的補助ページ、staff forms/pages の sibling テスト不足、staff mails/send_emails 導線のずれに集中している。
- 2026-03-16: static な legacy 補助ページは runtime 依存まで無理に移さず、まず Vue の file-based route で概要・導線・早見表を復元する方が安全。`staff/index` と `staff/settings` の両方に入口を足し、単体テストで文言を固定すると後の整理もしやすい。
- 2026-03-16: legacy の `/staff/forms/{form}/not_answered` は新 API を増やさなくても `useStaffFormAnswersIndexQuery()` の `notAnsweredCircles` を再利用して復元できる。answers index から専用画面へのリンクを足すだけで一覧画面の圧迫も減らせる。
