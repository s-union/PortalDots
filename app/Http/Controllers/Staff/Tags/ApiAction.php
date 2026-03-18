<?php

namespace App\Http\Controllers\Staff\Tags;

use App\GridMakers\TagsGridMaker;
use App\Http\Controllers\Controller;
use App\Http\Responders\Staff\GridResponder;
use Illuminate\Http\Request;

class ApiAction extends Controller
{
    public function __construct(private readonly GridResponder $gridResponder, private readonly TagsGridMaker $tagsGridMaker)
    {
    }

    public function __invoke(Request $request)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->tagsGridMaker)
            ->response();
    }
}
