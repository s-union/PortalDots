<?php

namespace App\Http\Controllers\Groups;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;

class ConfirmAction extends Controller
{
    public function __invoke(Group $group)
    {
        $this->authorize('group.update', $group);

        if (!Auth::user()->isLeaderInGroup($group)) {
            abort(403);
        }

        if (!$group->canSubmit()) {
            return redirect()
                ->route('groups.users.index', ['group' => $group])
                ->with('topAlert.type', 'danger')
                ->with('topAlert.title', '理大祭参加登録に必要な人数が揃っていないため、理大祭参加登録の提出はまだできません');
        }

        $group->load('users');

        return view('groups.confirm')
            ->with('group', $group);
    }
}
