<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UpdateLastAccessedAt
{
    /**
     * Handle an incoming request.
     *
     * @param  Request  $request
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        if (Auth::check()) {
            $user = $request->user();
            if (empty($user->last_accessed_at) || now()->subHour()->gte($user->last_accessed_at)) {
                $user->last_accessed_at = now();
                $user->save();
            }
        }

        return $next($request);
    }
}
