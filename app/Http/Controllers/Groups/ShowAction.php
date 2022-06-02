<?php

namespace App\Http\Controllers\Groups;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;

class ShowAction extends Controller
{
    public function __invoke(Group $group)
    {
        $this->authorize('group.belongsTo', $group);

        return view('groups.show')
            ->with('group', $group);
    }
}
