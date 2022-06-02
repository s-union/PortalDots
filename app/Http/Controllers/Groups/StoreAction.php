<?php

namespace App\Http\Controllers\Groups;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Groups\GroupRequest;
use App\Services\Groups\GroupsService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class StoreAction extends Controller
{
    /**
     * @var GroupsService
     */
    private $groupsService;

    public function __construct(GroupsService $groupsService)
    {
        $this->groupsService = $groupsService;
    }

    public function __invoke(GroupRequest $request)
    {
        $this->authorize('group.create');

        activity()->disableLogging();

        $result = DB::transaction(function () use ($request) {
            $group = $this->groupsService->create(
                Auth::user(),
                $request->group_name,
                $request->group_name_yomi
            );

            return redirect()
                ->route('groups.users.index', ['group' => $group]);
        });

        activity()->enableLogging();

        return $result;
    }
}
