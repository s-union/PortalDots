<?php

namespace App\Http\Controllers\Auth\Password;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\Password\ResetStartRequest;
use App\Services\Auth\ResetPasswordService;

class PostResetStartAction extends Controller
{
    public function __construct(private readonly ResetPasswordService $resetPasswordService)
    {
    }

    public function __invoke(ResetStartRequest $request)
    {
        $this->resetPasswordService->handleResetStart($request->login_id);

        return to_route('password.request')
            ->with('topAlert.title', 'メールを確認してください')
            ->with('topAlert.body', '今から5分以内に再設定してください。もし届かない場合はもう一度お試しください。');
    }
}
