<?php

namespace App\Http\Controllers\Auth\Password;

use App\Http\Controllers\Controller;

class ResetStartAction extends Controller
{
    public function __invoke()
    {
        return view('auth.passwords.request');
    }
}
