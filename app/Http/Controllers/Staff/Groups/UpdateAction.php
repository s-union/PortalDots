<?php

namespace App\Http\Controllers\Staff\Groups;

use App\Eloquents\Group;
use App\Eloquents\User;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Groups\GroupRequest;
use Illuminate\Support\Facades\DB;

class UpdateAction extends Controller
{
    public function __invoke(Group $group, GroupRequest $request)
    {
        DB::beginTransaction();

        $member_ids = str_replace(["\r\n", "\r", "\n"], "\n", $request->members);
        $member_ids = explode("\n", $member_ids);
        $member_ids = array_unique(array_filter($member_ids, "strlen"));

        $leader = User::where('student_id', $request->leader)->first();
        if (!empty($leader)) {
            $member_ids = array_diff($member_ids, [$leader->student_id]);
        }
        $members = User::whereIn('student_id', $member_ids)->get();

        $group->update([
            'group_name' => $request->group_name,
            'group_name_yomi' => $request->group_name_yomi
        ]);
        $group->users()->detach();

        if (!empty($leader)) {
            $leader->groups()->attach($group->id, ['is_leader' => true]);
        }
        foreach ($members as $member) {
            $member->groups()->attach($group->id, ['is_leader' => false]);
        }
        $group->save();

        DB::commit();

        return redirect()
            ->back()
            ->with('topAlert.title', '団体情報を更新しました');

    }
}
