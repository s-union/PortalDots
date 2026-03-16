<?php

namespace App\Http\Controllers\Staff\Pages;

use App\GridMakers\PagesGridMaker;
use App\Http\Controllers\Controller;
use App\Http\Responders\Staff\GridResponder;
use Illuminate\Http\Request;

class ApiAction extends Controller
{
    public function __construct(private readonly GridResponder $gridResponder, private readonly PagesGridMaker $pagesGridMaker)
    {
    }

    public function __invoke(Request $request)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->pagesGridMaker)
            ->response();
    }
}
