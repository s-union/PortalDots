<?php

namespace App\Http\Controllers\Staff\SendEmails;

use App\Eloquents\Email;
use App\Http\Controllers\Controller;

class DestroyAction extends Controller
{
    public function __invoke()
    {
        Email::query()->delete();

        return to_route('staff.send_emails')
            ->with('topAlert.title', '一斉メール送信をキャンセルしました');
    }
}
