<?php

namespace App\Http\Controllers\Groups;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;
use App\Services\Groups\GroupsService;
use Illuminate\Support\Facades\Auth;

class ShowAction extends Controller
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
        $this->authorize('group.belongsTo', $group);

        return view('groups.show')
            ->with('group', $group)
            ->with(
                'attendance_fee',
                Auth::check() ? $this->groupsService->attendanceFee(Auth::user()) : null
            )
            ->with(
                'circles',
                Auth::check() ? Auth::user()->circles->filter(function ($circle) {
                    return $circle->hasSubmitted();
                }) : null
            );
    }
}
