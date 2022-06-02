<?php

namespace App\Http\Controllers\Groups\Users;

use App\Eloquents\CustomForm;
use App\Eloquents\Group;
use App\Http\Controllers\Controller;
use App\Services\Groups\GroupsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StoreAction extends Controller
{
    /**
     * @var GroupsService
     */
    private $groupsService;

    public function __construct(GroupsService $groupsService)
    {
        $this->groupsService = $groupsService;
    }

    public function __invoke(Group $group, Request $request)
    {
        if ($group->invitation_token !== $request->invitation_token) {
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

        activity()->disableLogging();

        $this->groupsService->addMember($group, Auth::user());

        activity()->enableLogging();

        return redirect()
            ->route('groups.show', ['group' => $group])
            ->with('topAlert.title', "「{$group->group_name}」の理大祭係(副責任者)になりました");
    }
}
