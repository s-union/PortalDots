<?php

namespace App\Http\Controllers\Groups;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Groups\GroupRequest;
use App\Services\Groups\GroupsService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateAction extends Controller
{
    /**
     * @var GroupsService
     */
    private $groupsService;

    public function __construct(GroupsService $groupsService)
    {
        $this->groupsService = $groupsService;
    }

    public function __invoke(GroupRequest $request, Group $group)
    {
        $this->authorize('group.update', $group);

        if (!Auth::user()->isLeaderInGroup($group)) {
            abort(403);
        }

        activity()->disableLogging();

        DB::transaction(function () use ($request, $group) {
            $this->groupsService->update(
                $group,
                $request->group_name,
                $request->group_name_yomi
            );
        });

        activity()->enableLogging();

        return redirect()
            ->route('groups.users.index', ['group' => $group]);
    }
}
