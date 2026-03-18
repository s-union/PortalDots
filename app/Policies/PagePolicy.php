<?php

namespace App\Policies;

use App\Eloquents\Circle;
use App\Eloquents\Page;
use App\Eloquents\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PagePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view the page.
     */
    public function view(?User $user, Page $page, ?Circle $circle): bool
    {
        if (! $page->is_public || $page->is_pinned) {
            return false;
        }
        if (! $page->viewableTags->isEmpty()) {
            if (empty($circle)) {
                return false;
            }

            return $circle->tags()->whereIn('tags.id', $page->viewableTags->pluck('id')->all())->exists();
        }

        return true;
    }
}
