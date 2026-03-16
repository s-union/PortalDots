<?php

namespace App\Http\Middleware;

use App\Services\Utils\DotenvService;
use Closure;
use Illuminate\Http\Request;

/**
 * PortalDots がインストール済の場合、トップページへリダイレクトする
 */
class DenyIfInstalled
{
    /**
     * @var DotenvService
     */
    private $dotenvService;

    public function __construct(DotenvService $dotenvService)
    {
        $this->dotenvService = $dotenvService;
    }

    /**
     * Handle an incoming request.
     *
     * @param  Request  $request
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        if ($this->dotenvService->getValue('APP_NOT_INSTALLED', 'false') !== 'true') {
            abort(404);
        }

        return $next($request);
    }
}
