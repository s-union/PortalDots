<?php

namespace App\Http\Controllers\Groups\Users;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;
use App\Services\Groups\GroupsService;
use Illuminate\Support\Facades\Auth;

class RegenerateTokenAction extends Controller
{
    /**
     * @var GroupsService
     */
    private $groupsService;

    public function __construct(GroupsService $groupsService)
    {
        $this->groupsService = $groupsService;
    }

    public function __invoke(Group $group)
    {
        $this->authorize('group.update', $group);

        if (!Auth::user()->isLeaderInGroup($group)) {
            abort(404);
        }

        activity()->disableLogging();

        $this->groupsService->regenerateInvitationToken($group);

        activity()->enableLogging();

        return redirect()
            ->route('groups.users.index', ['group' => $group])
            ->with('topAlert.title', '招待URLを新しくつくりなおしました');
    }
}
