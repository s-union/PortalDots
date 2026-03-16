<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Eloquents\User;
use App\Notifications\Auth\Password\ResetStartNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\URL;

class ResetPasswordService
{
    /**
     * ログイン ID を受け取り、該当するユーザーが存在すればメールを送信する
     */
    public function handleResetStart(string $login_id)
    {
        $user = (new User)->firstByLoginId($login_id);

        if (! empty($user)) {
            $this->send($user);
        }
    }

    /**
     * メール送信
     */
    private function send(User $user)
    {
        $user->notify(new ResetStartNotification($user, $this->generateSignedUrl($user)));
    }

    /**
     * パスワード再設定用URLを発行する
     *
     * @return string
     */
    private function generateSignedUrl(User $user)
    {
        return URL::temporarySignedRoute(
            'password.reset',
            \Illuminate\Support\Facades\Date::now()->addMinutes(5),
            [
                'user' => $user->id,
            ]
        );
    }
}
