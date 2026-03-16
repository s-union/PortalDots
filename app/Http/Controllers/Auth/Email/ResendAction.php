<?php

namespace App\Http\Controllers\Auth\Email;

use App\Http\Controllers\Controller;
use App\Services\Auth\EmailService;
use Illuminate\Support\Facades\Auth;

class ResendAction extends Controller
{
    public function __construct(private readonly EmailService $emailService)
    {
    }

    public function __invoke()
    {
        $this->emailService->sendAll(Auth::user());

        return to_route('verification.notice')
            ->with('topAlert.title', '確認メールを再送しました。');
    }
}
