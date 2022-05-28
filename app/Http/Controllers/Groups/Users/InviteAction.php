<?php

namespace App\Http\Controllers\Groups\Users;

use App\Eloquents\CustomForm;
use App\Eloquents\Group;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;

class InviteAction extends Controller
{
    public function __invoke(Group $group, string $token)
    {
        if ($group->invitation_token !== $token) {
            abort(404);
        }

        $custom_form = CustomForm::getFormByType('circle');

        $can_join_group = isset($custom_form)
            && $custom_form->is_public
            && $custom_form->isOpen()
            && !$group->hasSubmitted();

        if (!$can_join_group) {
            abort(404);
        }

        if ($group->users->contains(Auth::user())) {
            $redirect_to = 'groups.show';
            if (Auth::user()->isLeaderInGroup($group)) {
                $redirect_to = 'groups.users.index';
            }
            return redirect()
                ->route($redirect_to, ['group' => $group])
                ->with('topAlert.title', 'あなたは既にメンバーです');
        }

        return view('groups.users.invite')
            ->with('group', $group);
    }
}
