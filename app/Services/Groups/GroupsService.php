<?php

namespace App\Services\Groups;

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
}
