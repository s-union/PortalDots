<?php

namespace App\Policies;

use App\Eloquents\Circle;
use App\Eloquents\Form;
use App\Eloquents\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class FormPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view the form.
     *
     * @param  Circle|null  $circle
     */
    public function view(?User $user, Form $form, ?Circle $circle): bool
    {
        if (! $form->answerableTags->isEmpty()) {
            if (empty($circle)) {
                return false;
            }

            return $circle->tags()->whereIn('tags.id', $form->answerableTags->pluck('id')->all())->exists();
        }

        return true;
    }
}
