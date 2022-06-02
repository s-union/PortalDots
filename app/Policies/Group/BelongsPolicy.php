<?php

namespace App\Policies\Group;

use App\Eloquents\Group;
use App\Eloquents\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class BelongsPolicy
{
    use HandlesAuthorization;

    public function __invoke(User $user, Group $group): bool
    {
        $result = $group->users()->where('group_user.user_id', $user->id)->first();
        return !empty($result);
    }
}
