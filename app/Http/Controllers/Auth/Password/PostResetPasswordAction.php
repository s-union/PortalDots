<?php

namespace App\Http\Controllers\Auth\Password;

use App\Eloquents\User;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\Password\ResetPasswordRequest;
use App\Services\Users\ChangePasswordService;

class PostResetPasswordAction extends Controller
{
    public function __construct(private readonly ChangePasswordService $changePasswordService)
    {
    }

    public function __invoke(ResetPasswordRequest $request, User $user)
    {
        // signedミドルウェアが設定されていれば、$user は信頼できる
        $this->changePasswordService->changePassword($user, $request->new_password);

        return to_route('login')
            ->with('topAlert.title', 'パスワードを変更しました。');
    }
}
