<?php

namespace App\Http\Controllers\Staff\Users;

use App\Eloquents\User;
use App\Http\Controllers\Controller;

class DestroyAction extends Controller
{
    public function __invoke(User $user)
    {
        $user->delete();

        return redirect()
            ->route('staff.users.index')
            ->with('topAlert.title', 'ユーザーを削除しました');
    }
}
