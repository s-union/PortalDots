<?php

namespace App\Http\Controllers\Staff\Tags;

use App\Eloquents\Tag;
use App\Http\Controllers\Controller;

class EditAction extends Controller
{
    public function __invoke(Tag $tag)
    {
        return view('staff.tags.form')
            ->with('tag', $tag);
    }
}
