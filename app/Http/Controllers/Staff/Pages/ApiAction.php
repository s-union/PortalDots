<?php

namespace App\Http\Controllers\Staff\Pages;

use App\GridMakers\PagesGridMaker;
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
     * @var PagesGridMaker
     */
    private $pagesGridMaker;

    public function __construct(
        GridResponder $gridResponder,
        PagesGridMaker $pagesGridMaker
    ) {
        $this->gridResponder = $gridResponder;
        $this->pagesGridMaker = $pagesGridMaker;
    }

    public function __invoke(Request $request)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->pagesGridMaker)
            ->response();
    }
}
