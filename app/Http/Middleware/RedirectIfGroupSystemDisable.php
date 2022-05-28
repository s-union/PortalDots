<?php

namespace App\Http\Middleware;

use App\Services\Utils\DotenvService;
use Closure;
use Illuminate\Http\Request;

class RedirectIfGroupSystemDisable
{
    /**
     * @var DotenvService;
     */
    private $dotenvService;

    public function __construct(DotenvService $dotenvService)
    {
        $this->dotenvService = $dotenvService;
    }

    public function handle(Request $request, Closure $next)
    {
        $register_group_before_submitting_circle =
            $this->dotenvService->getValue(
                'PORTAL_GROUP_REGISTER_BEFORE_SUBMITTING_CIRCLE',
                'false'
            ) === 'true';
        if (!$register_group_before_submitting_circle) {
            return redirect()->route('home');
        }
        return $next($request);
    }
}
