<?php

namespace App\Http\Controllers\Auth\Email;

use App\Http\Controllers\Controller;

class CompletedAction extends Controller
{
    public function __invoke()
    {
        return view('auth.verify_completed');
    }
}
