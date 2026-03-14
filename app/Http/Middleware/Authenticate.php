<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        if (!$request->expectsJson()) {
            /** @var \Illuminate\Session\Store $session */
            $session = $request->session();
            $session->flash('topAlert.title', 'ログインしてください');
            $session->flash('topAlert.body', 'このページにアクセスするには、まずログインしてください');
            $session->flash('topAlert.keepVisible', true);
            return route('login');
        }

        return null;
    }
}
