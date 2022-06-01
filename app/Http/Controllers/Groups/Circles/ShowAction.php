<?php

namespace App\Http\Controllers\Groups\Circles;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;

class ShowAction extends Controller
{
    public function __invoke(Group $group)
    {
        return view('groups.circles.show')
            ->with('group', $group)
            ->with('circle', $group->circle());
    }
}
