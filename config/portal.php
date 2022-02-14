<?php

return [
    // ポータル管理者の組織名
    // ポータルを管理している実行委員会名などを指定します。
    'admin_name' => env('PORTAL_ADMIN_NAME'),
    // 連絡先メールアドレス
    // ここで設定したメールアドレスが、運営者の連絡先として表示されるほか、お問い合わせフォームの送信先として使用されます。
    'contact_email' => env('PORTAL_CONTACT_EMAIL'),
    // 管理者のTwitterのスクリーンネーム
    'admin_twitter' => env('PORTAL_ADMIN_TWITTER'),
    // 大学提供メールアドレスのドメイン
    // @ より後ろの文字列を指定
    'univemail_domain' => env('PORTAL_UNIVEMAIL_DOMAIN'),
    // 企画参加登録に必要なユーザーの人数
    // 団体責任者と新歓係(副責任者)のの合計人数
    'users_number_to_submit_circle' => (int)env('PORTAL_USERS_NUMBER_TO_SUBMIT_CIRCLE', 2),
    // アクセントカラー
    'primary_color_hsl' => [env('PORTAL_PRIMARY_COLOR_H', null), env('PORTAL_PRIMARY_COLOR_S', null), env('PORTAL_PRIMARY_COLOR_L', null)],
    // デモモード
    'enable_demo_mode' => env('PORTAL_ENABLE_DEMO_MODE', false),
];
