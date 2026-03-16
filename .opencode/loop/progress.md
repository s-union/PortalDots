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
- 2026-03-16: `workspace/contact` は categories/history の query が独立しているので、失敗系テストも UI 全体を壊さずに局所確認しやすい。カテゴリ取得失敗時は select がプレースホルダのみになること、422 送信失敗時は `extractContactValidationMessage()` 経由の文言だけを出すことを固定すると安心。
- 2026-03-16: public auth の legacy 導線は、backend API が未移行でも file-based route を先に生やして `catch-all` から切り離せる。`publicOnly` と `requiresAuth` を URL ごとに分け、共通 notice component で legacy との差分だけ説明すると route guard とテストの見通しがよい。
- 2026-03-16: auth の file-based route を追加した後は `frontend/src/pages/[...all].vue` 側の同名 legacy 分岐が死蔵しやすい。`[...all].test.ts` から重複ケースを外した上で、router guard 側に publicOnly/requiresAuth の到達確認を足す follow-up が必要。
- 2026-03-16: `/support` と `/privacy_policy` のような public 静的ページは catch-all に残すより file-based route へ切り出した方が責務が明確。既存 markdown/raw import をそのまま専用 page に移し、legacy fallback テストから対応ケースを削ると 404 画面の条件分岐も軽くできる。
- 2026-03-16: `staff/participation-types/index.vue` の回帰テストは `staff/circles/index.test.ts` と同じく `fetch` stub だけで十分書ける。`/staff/status` と一覧 GET/POST を最小限返し、作成後の再取得で追加行と詳細リンク href を確認すると一覧画面の主要導線を安く固定できる。
- 2026-03-16: legacy `/staff` の「権限未付与」カードは、現行 migrated では `staffGuard()` が staff 権限ゼロのユーザーを `/` に戻すためそのままは再現しにくい。follow-up は dashboard 内の非表示リンクよりも、到達可能な public/home 導線の parity を優先した方が小さく前進しやすい。
- 2026-03-16: legacy home の guest parity は `frontend/src/pages/index.vue` の CTA 群だけで小さく改善できる。`/login` だけでなく `/register` も並べ、`index.test.ts` で href を固定すると public 導線の後退を防ぎやすい。
- 2026-03-16: public 静的ページを切り出したら、legacy `AppFooter` 相当の shell 導線も一緒に戻すと到達性が上がる。`frontend/src/app/App.vue` の drawer footer に `/support` `/privacy_policy` と公式サイトリンクを置き、`App.test.ts` で anchor href だけを軽く確認するのが安全。
- 2026-03-16: file-based public route を増やした後は router guard テストも合わせて追加する。`frontend/src/app/router/index.test.ts` で `fetch` が呼ばれないことまで確認すると、session bootstrap を誤って必須化した退行を防げる。
- 2026-03-16: guest auth parity は page 本体だけでなく login からの補助リンクも要固定。`frontend/src/pages/login.test.ts` に `/password/reset` と `/register` の href 確認を足しておくと、文言や遷移先の崩れを安く拾える。
- 2026-03-16: auth guidance page を増やした後は route variant ごとの guard 差も router test に寄せる。`publicOnly` の signed link 群と `requiresAuth` の completed 画面を同じ `index.test.ts` で押さえると、個別 page test より guard 退行を見つけやすい。
- 2026-03-16: public footer を drawer にだけ置くと mobile で気づきにくい。`PublicFooterLinks` のような小コンポーネントへ抽出して `main` 下にも再利用すると、desktop/mobile の両方で parity を保ちやすい。
- 2026-03-16: legacy toolbar の補助導線は、一覧 page の `SurfaceHeader` actions に戻すのが最小差分で効く。`staff/pages/index.vue` なら `/staff/mails` CTA を 1 本足すだけで send_emails 相当の再発見性をかなり戻せる。
- 2026-03-16: destructive action の legacy parity は専用 delete page を作り直さなくても `window.confirm` で十分回収できる。`staff/tags.vue` のように注意文を複数行メッセージへ寄せ、テストでは confirm 文面の要点だけを見ると保守しやすい。
- 2026-03-16: `staff/forms/index.vue` の copy/delete も tags と同じ confirm パターンで安全に復元できる。confirm をキャンセルしたときに mutation が走らないことと、copy 後の詳細遷移だけを `index.test.ts` で押さえると一覧ページの destructive parity を軽く固定できる。
- 2026-03-16: follow-up で changed symbol の caller を見ると `useCopyStaffFormMutation` / `useDeleteStaffFormMutation` は `/staff/forms/[formId]` でも使われていた。一覧だけ confirm 復元すると detail との体験差が残るので、sibling page まで同じ文面と回帰テストをそろえるのが次の最小タスク。
- 2026-03-16: form detail 側も confirm 文面は一覧と共有 utility に寄せるとぶれない。follow-up で legacy `staff/places/index.blade.php` を見ると「削除時は企画自体ではなく使用場所設定だけ解除される」注意が未移植だったので、次は `staff/places.vue` の destructive parity を埋めるのが自然。
- 2026-03-16: `staff/places.vue` の delete confirm は legacy の注意文をそのまま移すだけで十分効く。作成・更新・削除が同じテストに載っている一覧ページでは、confirm 実行ケースに加えて cancel 時に DELETE が飛ばないケースを別テストへ分けると読みやすい。
- 2026-03-16: places の次は `staff/contacts/categories/delete.blade.php` が同系統の未移植ギャップとして残る。カテゴリ一覧には delete 確認がないので、legacy の「名前 + メールアドレス」を確認する単文 confirm を戻すと sibling の destructive parity を横展開しやすい。
- 2026-03-16: `staff/contact-categories.vue` の confirm は複雑な注意文までは不要で、legacy delete page と同じ 1 行メッセージで十分。`名前(email)` の完全一致をテストしておくと、連絡先メールの取り違えも拾える。
- 2026-03-16: destructive parity の横展開先としては `staff/forms/[formId]/answers/[answerId]/edit.vue` も自然。legacy answers 一覧には「削除通知は企画に送られない」という 1 行注意があるので、answer edit の削除ボタンにも同じ confirm を足しておくと staff 操作の意図が伝わりやすい。
- 2026-03-16: answer edit の delete confirm は `groupName` があれば十分組み立てられるので detail query の追加 API は不要。cancel 時に route が変わらず DELETE も飛ばないことまで test で押さえると、回答編集の事故を防ぎやすい。
- 2026-03-16: 次の parity 候補は document detail。legacy 一覧の confirm は資料名を含むだけの単純文なので、`staff/documents/[documentId]/edit.vue` でも detail query の `name` を使って同じ文字列へ寄せるだけで十分。
- 2026-03-16: document detail も confirm 文面は feature API 側 utility に寄せると一覧/detail で共有しやすい。cancel 時の route 維持を別テストにしておくと、既存の update/delete 複合テストを壊さず parity を足せる。
