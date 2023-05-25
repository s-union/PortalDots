<?php

namespace App\Policies\Circle;

use App\Eloquents\Circle;
use App\Eloquents\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UpdateGroupNamePolicy
{
    use HandlesAuthorization;

    public function __invoke(User $user, Circle $circle): bool
    {
        return $circle->can_change_group_name;
    }
}
