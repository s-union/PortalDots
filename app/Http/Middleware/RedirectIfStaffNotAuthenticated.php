<?php

namespace App\Http\Middleware;

use App\Services\Auth\StaffAuthService;
use Closure;
use Illuminate\Http\Request;

class RedirectIfStaffNotAuthenticated
{
    /**
     * @var StaffAuthService
     */
    private $staffAuthService;

    public function __construct(StaffAuthService $staffAuthService)
    {
        $this->staffAuthService = $staffAuthService;
    }

    /**
     * Handle an incoming request.
     *
     * @param  Request  $request
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        if (! $request->session()->get('staff_authorized') && ! config('portal.enable_demo_mode')) {
            $this->staffAuthService->setPreviousUrl($request->url());

            return redirect()
                ->route('staff.verify.index');
        }

        return $next($request);
    }
}
