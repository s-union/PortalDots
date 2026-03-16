<?php

namespace App\Http\Controllers\Staff\Users;

use App\Eloquents\User;
use App\Http\Controllers\Controller;

class EditAction extends Controller
{
    public function __invoke(User $user)
    {
        return view('staff.users.form')
            ->with('user', $user);
    }
}
