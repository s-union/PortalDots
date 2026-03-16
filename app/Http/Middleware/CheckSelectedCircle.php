<?php

namespace App\Http\Middleware;

use App\Services\Circles\SelectorService;
use Auth;
use Closure;
use Gate;
use Request;

class CheckSelectedCircle
{
    public function __construct(private readonly SelectorService $selectorService)
    {
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        if (! Auth::check()) {
            return $next($request);
        }

        if (
            empty($this->selectorService->getCircle()) ||
            Gate::denies('circle.belongsTo', $this->selectorService->getCircle())
        ) {
            $this->selectorService->reset();
        }

        $circles_count = Auth::user()->circles()->approved()->count();

        if (empty($this->selectorService->getCircle())) {
            if ($circles_count >= 2) {
                $request->session()->reflash();

                return to_route('circles.selector.show', ['redirect_to' => Request::path()]);
            }

            $this->selectorService->setCircle(Auth::user()->circles()->approved()->first());
        }

        return $next($request);
    }
}
