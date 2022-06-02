<?php

namespace App\Http\Controllers\Staff\Groups;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;

class EditAction extends Controller
{
    public function __invoke(Group $group)
    {
        $group->load('users');

        $member_ids = '';
        $members = $group->users->filter(function ($user) {
            return !$user->pivot->is_leader;
        });
        foreach ($members as $member) {
            $member_ids .= $member->student_id . "\r\n";
        }
        $leader = $group->users->filter(function ($user) {
            return $user->pivot->is_leader;
        })->first();

        return view('staff.groups.form')
            ->with('group', $group)
            ->with('leader', $leader)
            ->with('members', $member_ids);
    }
}
