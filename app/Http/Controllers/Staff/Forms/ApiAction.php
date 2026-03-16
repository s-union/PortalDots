<?php

namespace App\Http\Controllers\Staff\Forms;

use App\GridMakers\FormsGridMaker;
use App\Http\Controllers\Controller;
use App\Http\Responders\Staff\GridResponder;
use Illuminate\Http\Request;

class ApiAction extends Controller
{
    public function __construct(private readonly GridResponder $gridResponder, private readonly FormsGridMaker $formsGridMaker)
    {
    }

    public function __invoke(Request $request)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->formsGridMaker)
            ->response();
    }
}
