<?php

namespace App\Services\Groups;

use App\Consts\CircleConsts;
use App\Eloquents\Circle;
use App\Eloquents\Group;
use App\Eloquents\User;
use App\Mail\Groups\SubmittedMailable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class GroupsService
{
    public function create(User $leader, string $group_name, string $group_name_yomi)
    {
        return DB::transaction(function () use ($leader, $group_name, $group_name_yomi) {
            $group = Group::create([
                'group_name' => $group_name,
                'group_name_yomi' => $group_name_yomi,
                'invitation_token' => $this->generateInvitationToken()
            ]);
            $group->users()->save($leader, ['is_leader' => true]);

            return $group;
        });
    }

    public function update(Group $group, string $group_name, string $group_name_yomi)
    {
        return $group->update([
            'group_name' => $group_name,
            'group_name_yomi' => $group_name_yomi
        ]);
    }

    public function addMember(Group $group, User $user)
    {
        $group->users()->save($user, ['is_leader' => false]);
    }

    public function removeMember(Group $group, User $user)
    {
        $group->users()->detach($user->id);
    }

    public function submit(Group $group)
    {
        $group->submitted_at = now();
        $group->save();
    }

    public function regenerateInvitationToken(Group $group)
    {
        $group->update([
            'invitation_token' => $this->generateInvitationToken()
        ]);
    }

    public function sendSubmittedEmail(User $user, Group $group)
    {
        Mail::to($user)
            ->send(
                (new SubmittedMailable($group))
                    ->replyTo(config('portal.contact_email'), config('portal.admin_name'))
                    ->subject("【理大祭参加登録】「{$group->group_name}」の理大祭参加登録を提出・受理しました")
            );
    }

    private function generateInvitationToken()
    {
        return bin2hex(random_bytes(16));
    }

    // TODO: 適切な位置に移動させる

    /**
     * User の所属する Circle (未提出のものは除く) の企画参加登録費を取得します.
     * この企画参加登録費は第1次の参加形態のみを対象とします.
     *
     * @param User|null $user
     * @return int|null Userがnullの場合,またはUserがどの企画にも所属していない場合はnull
     */
    public function attendanceFee(?User $user): ?int
    {
        if (!$user) {
            return null;
        }

        $circles = $user->circles->filter(
            function ($circle) {
                return $circle->isPending();
            }
        );
        if (count($circles) === 0) {
            return null;
        }

        $attendance_fee = 0;
        foreach ($circles as $circle) {
            $attendance_fee += CircleConsts::ATTENDANCE_FEE_V1[$circle->attendance_type];
        }
        return $attendance_fee;
    }

    public function attendanceTypeDescription(?User $user): ?string
    {
        if (!$user) {
            return null;
        }

        $circles = $user->circles->filter(
            function ($circle) {
                return $circle->isPending();
            }
        );
        if (count($circles) === 0) {
            return null;
        }

        $attendance_types = [];
        foreach ($circles as $circle) {
            $attendance_types[] = $circle->attendance_type;
        }
        $attendance_type_to_num = array_count_values($attendance_types);

        // CircleConstsで定義した順番にソートする.
        $attendance_types_with_sort_id = array_values(CircleConsts::CIRCLE_ATTENDANCE_TYPES_V1);
        uksort($attendance_type_to_num, function ($a, $b) use ($attendance_types_with_sort_id) {
            return array_search($a, $attendance_types_with_sort_id) > array_search($b, $attendance_types_with_sort_id);
        });

        $str = "";
        foreach ($attendance_type_to_num as $type => $num) {
            $str = $str . $type . " : " . $num . " ブース, ";
        }
        return substr($str, 0, -2);
    }
}
