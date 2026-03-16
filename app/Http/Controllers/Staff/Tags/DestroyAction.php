<?php

namespace App\Http\Controllers\Staff\Tags;

use App\Eloquents\Tag;
use App\Http\Controllers\Controller;

class DestroyAction extends Controller
{
    public function __invoke(Tag $tag)
    {
        $tag->delete();

        return redirect()
            ->route('staff.tags.index')
            ->with('topAlert.title', 'タグを削除しました');
    }
}
