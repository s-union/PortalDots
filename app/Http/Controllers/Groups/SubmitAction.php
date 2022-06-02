<?php

namespace App\Http\Controllers\Groups;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;
use App\Services\Groups\GroupsService;
use Illuminate\Support\Facades\Auth;

class SubmitAction extends Controller
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
            abort(403);
        }

        if (!$group->canSubmit()) {
            return redirect()
                ->route('groups.users.index', ['group' => $group])
                ->with('topAlert.type', 'danger')
                ->with('topAlert.title', '理大祭参加登録に必要な人数が揃っていないため、理大祭参加登録の提出はまだできません');
        }

        $this->groupsService->submit($group);

        $group->load('users');
        foreach ($group->users as $user) {
            $this->groupsService->sendSubmittedEmail($user, $group);
        }

        return redirect()
            ->route('home')
            ->with('topAlert.title', '理大祭参加登録を提出しました！');
    }
}
