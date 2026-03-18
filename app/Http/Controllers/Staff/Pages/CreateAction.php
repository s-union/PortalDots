<?php

namespace App\Http\Controllers\Staff\Pages;

use App\Eloquents\Document;
use App\Eloquents\Tag;
use App\Http\Controllers\Controller;

class CreateAction extends Controller
{
    public function __invoke()
    {
        return view('staff.pages.form')
            ->with('default_tags', \json_encode([]))
            ->with('tags_autocomplete_items', Tag::get()->pluck('name')->map(fn($item) => ['text' => $item])->toJson())
            ->with('default_documents', \json_encode([]))
            ->with('documents_autocomplete_items', Document::get()->map(fn($item) => ['text' => $item->name, 'value' => $item->id])->toJson());
    }
}
