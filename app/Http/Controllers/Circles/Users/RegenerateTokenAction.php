<?php

namespace App\Http\Controllers\Circles\Users;

use App\Eloquents\Circle;
use App\Http\Controllers\Controller;
use App\Services\Circles\CirclesService;
use Auth;

class RegenerateTokenAction extends Controller
{
    /**
     * @var CirclesService
     */
    private $circlesService;

    public function __construct(CirclesService $circlesService)
    {
        $this->circlesService = $circlesService;
    }

    public function __invoke(Circle $circle)
    {
        $this->authorize('circle.update', $circle);

        if (! Auth::user()->isLeaderInCircle($circle)) {
            abort(403);
        }

        activity()->disableLogging();
        $this->circlesService->regenerateInvitationToken($circle);
        activity()->enableLogging();

        return redirect()
            ->route('circles.users.index', ['circle' => $circle])
            ->with('topAlert.title', '招待URLを新しくつくりなおしました');
    }
}
