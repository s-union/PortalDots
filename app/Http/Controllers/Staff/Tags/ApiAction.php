<?php

namespace App\Http\Controllers\Staff\Tags;

use App\GridMakers\TagsGridMaker;
use App\Http\Controllers\Controller;
use App\Http\Responders\Staff\GridResponder;
use Illuminate\Http\Request;

class ApiAction extends Controller
{
    /**
     * @var GridResponder
     */
    private $gridResponder;

    /**
     * @var TagsGridMaker
     */
    private $tagsGridMaker;

    public function __construct(
        GridResponder $gridResponder,
        TagsGridMaker $tagsGridMaker
    ) {
        $this->gridResponder = $gridResponder;
        $this->tagsGridMaker = $tagsGridMaker;
    }

    public function __invoke(Request $request)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->tagsGridMaker)
            ->response();
    }
}
