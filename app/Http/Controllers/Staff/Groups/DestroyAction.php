<?php

namespace App\Http\Controllers\Staff\Groups;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;

class DestroyAction extends Controller
{
    public function __invoke(Group $group)
    {
        $group->delete();
        return redirect(route('staff.groups.index'));
    }
}
