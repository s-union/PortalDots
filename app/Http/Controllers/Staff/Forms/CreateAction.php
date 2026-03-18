<?php

namespace App\Http\Controllers\Staff\Forms;

use App\Eloquents\Tag;
use App\Http\Controllers\Controller;

class CreateAction extends Controller
{
    public function __invoke()
    {
        return view('staff.forms.form')
            ->with('default_tags', \json_encode([]))
            ->with('tags_autocomplete_items', Tag::get()->pluck('name')->map(fn($item) => ['text' => $item])->toJson());
    }
}
