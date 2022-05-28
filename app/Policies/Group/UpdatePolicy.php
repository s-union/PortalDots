<?php

namespace App\Policies\Group;

use App\Eloquents\CustomForm;
use App\Eloquents\Group;
use App\Eloquents\User;
use App\Services\Utils\DotenvService;
use Illuminate\Auth\Access\HandlesAuthorization;

class UpdatePolicy
{
    use HandlesAuthorization;

    /**
     * @var DotenvService
     */
    private $dotenvService;

    public function __construct(DotenvService $dotenvService)
    {
        $this->dotenvService = $dotenvService;
    }

    public function __invoke(User $user, Group $group): bool
    {
        $register_group_before_submitting_circle =
            $this->dotenvService->getValue(
                'PORTAL_GROUP_REGISTER_BEFORE_SUBMITTING_CIRCLE',
                'false'
            ) === 'true';
        $custom_from = CustomForm::getFormByType('circle');
        $can_register_circle = isset($custom_from) && $custom_from->is_public && $custom_from->isOpen();
        $has_yes_submitted = !$group->hasSubmitted();

        return $register_group_before_submitting_circle && $can_register_circle && $has_yes_submitted;
    }
}
