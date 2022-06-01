<?php

namespace App\Http\Controllers\Groups\Circles;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;
use App\Services\Circles\CirclesService;
use App\Services\Groups\GroupsService;
use Illuminate\Support\Facades\Auth;

class SubmitAction extends Controller
{
    /**
     * @var CirclesService
     */
    private $circlesService;

    /**
     * @var GroupsService
     */
    private $groupsService;

    public function __construct(CirclesService $circlesService, GroupsService $groupsService)
    {
        $this->circlesService = $circlesService;
        $this->groupsService = $groupsService;
    }

    public function __invoke(Group $group)
    {
        $this->authorize('circle.update', $group->circle());

        if (!Auth::user()->isLeaderInGroup($group)) {
            abort(403);
        }

        $this->circlesService->submit($group->circle());

        foreach ($group->users as $user) {
            $this->groupsService->sendCircleSubmittedEmail($user, $group);
        }

        return redirect()
            ->route('home')
            ->with('topAlert.title', '企画参加登録を提出しました！');
    }
}
