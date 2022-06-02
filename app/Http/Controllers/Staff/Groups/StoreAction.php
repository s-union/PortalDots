<?php

namespace App\Http\Controllers\Staff\Groups;

use App\Eloquents\Group;
use App\Eloquents\User;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Groups\GroupRequest;
use Illuminate\Support\Facades\DB;

class StoreAction extends Controller
{
    /**
     * @var User
     */
    private $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function __invoke(GroupRequest $request)
    {
        DB::beginTransaction();

        $member_ids = str_replace(["\r\n", "\r", "\n"], "\n", $request->members);
        $member_ids = explode("\n", $member_ids);
        $member_ids = array_unique(array_filter($member_ids, "strlen"));

        $leader = $this->user->firstByStudentId($request->leader);
        if (!empty($leader)) {
            $member_ids = array_diff($member_ids, [$leader->student_id]);
        }
        $members = $this->user->getByStudentIdIn($member_ids);

        // 保存処理
        $group = Group::create([
            'group_name' => $request->group_name,
            'group_name_yomi' => $request->group_name_yomi,
            'submitted_at' => now()
        ]);
        $group->users()->detach();

        if (!empty($leader)) {
            $leader->groups()->attach($group->id, ['is_leader' => true]);
        }
        foreach ($members as $member) {
            $member->groups()->attach($group->id, ['is_leader' => false]);
        }

        DB::commit();

        return redirect()
            ->route('staff.groups.create')
            ->with('topAlert.title', '団体情報を作成しました');
    }
}
