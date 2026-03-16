<?php

namespace App\Policies\Circle;

use App\Eloquents\ParticipationType;
use App\Eloquents\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CreatePolicy
{
    use HandlesAuthorization;

    /**
     * Create a new policy instance.
     *
     * @return void
     */
    public function __construct() {}

    public function __invoke(?User $user, ?ParticipationType $participationType = null)
    {
        if (empty($participationType)) {
            return ParticipationType::public()->open()->count() > 0;
        }

        return $participationType->form->is_public
            && $participationType->form->isOpen();
    }
}
