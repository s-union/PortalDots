<?php

namespace App\Http\Controllers\Install\Mail;

use App\Http\Controllers\Controller;
use App\Services\Install\MailService;

class EditAction extends Controller
{
    public function __construct(private readonly MailService $mailService)
    {
    }

    public function __invoke()
    {
        return view('install.mail.form')
            ->with('labels', $this->mailService->getFormLabels())
            ->with('mail', $this->mailService->getInfo());
    }
}
