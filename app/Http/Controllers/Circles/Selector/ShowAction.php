<?php

namespace App\Http\Controllers\Circles\Selector;

use App\Eloquents\ParticipationType;
use App\Http\Controllers\Controller;
use App\Services\Circles\SelectorService;
use Illuminate\Http\Request;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Auth;

class ShowAction extends Controller
{
    public function __construct(private readonly Router $router, private readonly SelectorService $selectorService)
    {
    }

    public function __invoke(Request $request)
    {
        $redirect_to = $request->redirect_to;
        if (isset($redirect_to)) {
            $user = Auth::user();
            $circles = $this->selectorService->getSelectableCirclesList($user);
            $not_submitted_circles = $user
                ->circles()->notSubmitted()->with('participationType')->get();

            return view('circles.selector')
                ->with('redirect_to', $redirect_to)
                ->with('circles', $circles)
                ->with('participation_types', ParticipationType::open()->public()->get())
                ->with('not_submitted_circles', $not_submitted_circles)
                ->with('error_message', session('error_message'));
        }

        abort(404);
    }
}
