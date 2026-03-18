<?php

namespace App\Http\Controllers\Staff\Verify;

use App\Http\Controllers\Controller;
use App\Services\Auth\StaffAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VerifyAction extends Controller
{
    public function __construct(private readonly StaffAuthService $staffAuthService)
    {
    }

    public function __invoke(Request $request)
    {
        $previous_url = $this->staffAuthService->getPreviousUrl();
        $result = $this->staffAuthService->verifyAndAuthenticate(Auth::user(), $request->verify_code);

        if (! $result) {
            return to_route('staff.verify.index')
                ->withErrors(['verify_code' => '認証コードが間違っているか、期限切れです。再度お試しください。']);
        }

        if (! empty($previous_url)) {
            return redirect($previous_url);
        }

        return to_route('staff.index');
    }
}
