<?php

namespace App\Http\Controllers\Auth\Password;

use App\Eloquents\User;
use App\Http\Controllers\Controller;

class ResetPasswordAction extends Controller
{
    public function __invoke(User $user)
    {
        return view('auth.passwords.reset');
    }
}
