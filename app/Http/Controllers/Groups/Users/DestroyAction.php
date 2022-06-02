<?php

namespace App\Http\Controllers\Groups\Users;

use App\Eloquents\Group;
use App\Eloquents\User;
use App\Http\Controllers\Controller;
use App\Services\Groups\GroupsService;
use Illuminate\Support\Facades\Auth;

class DestroyAction extends Controller
{
    /**
     * @var GroupsService
     */
    private $groupsService;

    public function __construct(GroupsService $groupsService)
    {
        $this->groupsService = $groupsService;
    }

    public function __invoke(Group $group, User $user)
    {
        $this->authorize('group.update', $group);

        if ($user->groups()->findOrFail($group->id)->pivot->is_leader) {
            return redirect()
                ->route('groups.users.index', ['group' => $group])
                ->with('topAlert.type', 'danger')
                ->with('topAlert.title', '責任者を削除することはできません');
        }

        if (!Auth::user()->isLeaderInGroup($group) && $user->id !== Auth::id()) {
            return redirect()
                ->route('groups.show', ['group' => $group])
                ->with('topAlert.type', 'danger')
                ->with('topAlert.title', '他のメンバーを削除することはできません');
        }

        activity()->disableLogging();

        $this->groupsService->removeMember($group, $user);

        activity()->enableLogging();

        if ($user->id === Auth::id()) {
            return redirect()
                ->route('home')
                ->with('topAlert.title', "メンバーを削除しました");
        }
        return redirect()
            ->route('groups.users.index', ['group' => $group])
            ->with('topAlert.title', "メンバーを削除しました");
    }
}
