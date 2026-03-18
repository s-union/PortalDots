<?php

namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\ChangePasswordRequest;
use App\Services\Users\ChangePasswordService;
use Illuminate\Support\Facades\Auth;

class PostChangePasswordAction extends Controller
{
    public function __construct(private readonly ChangePasswordService $changePasswordService)
    {
    }

    public function __invoke(ChangePasswordRequest $request)
    {
        // ChangePasswordRequest クラス内で、現在のパスワードが正しいことも含めてのバリデーション済み

        $this->changePasswordService->changePassword(Auth::user(), $request->new_password);

        return to_route('user.password')
            ->with('topAlert.title', 'パスワードを変更しました。');
    }
}
