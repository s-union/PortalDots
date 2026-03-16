<?php

namespace App\Http\Controllers\Staff\Tags;

use App\Eloquents\Tag;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Tags\TagRequest;

class UpdateAction extends Controller
{
    public function __invoke(TagRequest $request, Tag $tag)
    {
        $tag->name = $request->validated()['name'];
        $tag->save();

        return back()
            ->with('topAlert.title', 'タグを更新しました');
    }
}
