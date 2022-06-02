<?php

namespace App\Http\Controllers\Groups;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;

class DeleteAction extends Controller
{
    public function __invoke(Group $group)
    {
        $this->authorize('group.update', $group);
        $user = $group->users()->where('user_id', Auth::id())->first();

        if (empty($user) || !$user->pivot->is_leader) {
            abort(403);
        }

        return view('groups.delete')
            ->with('group', $group);
    }
}
