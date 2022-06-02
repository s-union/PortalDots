<?php

namespace App\Http\Controllers\Groups;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;

class EditAction extends Controller
{
    public function __invoke(Group $group)
    {
        $this->authorize('group.update', $group);

        if (!\Auth::user()->isLeaderInGroup($group)) {
            abort(403);
        }

        return view('groups.form')
            ->with('group', $group);
    }
}
