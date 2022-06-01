<?php

namespace App\Policies\Circle;

use App\Eloquents\User;
use App\Eloquents\CustomForm;
use App\Services\Utils\DotenvService;
use Illuminate\Auth\Access\HandlesAuthorization;

class CreatePolicy
{
    use HandlesAuthorization;

    /**
     * @var DotenvService
     */
    private $dotenvService;

    /**
     * Create a new policy instance.
     *
     * @return void
     */
    public function __construct(DotenvService $dotenvService)
    {
        $this->dotenvService = $dotenvService;
    }

    public function __invoke(?User $user)
    {
        $register_group_before_submitting_circle =
            $this->dotenvService->getValue(
                'PORTAL_GROUP_REGISTER_BEFORE_SUBMITTING_CIRCLE',
                'false'
            ) === 'true';
        $custom_from = CustomForm::getFormByType('circle');
        $can_register_circle = isset($custom_from) && $custom_from->is_public && $custom_from->isOpen();

        if ($register_group_before_submitting_circle) {
            if (!$user || count($user->groups) == 0) {
                return false;
            }
            $has_registered_group = $user->groups->first()->hasSubmitted();
            $is_leader_in_group = $user->isLeaderInGroup($user->groups()->first());
            return $has_registered_group && $can_register_circle && $is_leader_in_group;
        } else {
            return $can_register_circle;
        }
    }
}
