<?php

namespace App\Http\Controllers\Staff\Tags;

use App\Eloquents\Tag;
use App\Http\Controllers\Controller;

class DeleteAction extends Controller
{
    public function __invoke(Tag $tag)
    {
        return view('staff.tags.delete')
            ->with('tag', $tag);
    }
}
