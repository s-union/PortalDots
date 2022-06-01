<?php

namespace App\Http\Controllers\Groups\Circles;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;

class ConfirmAction extends Controller
{
    public function __invoke(Group $group)
    {
        $this->authorize('circle.update',
            $group->circle());

        return view('groups.circles.confirm')
            ->with('group', $group);
    }
}
