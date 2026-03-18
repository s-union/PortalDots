<?php

namespace App\Http\Controllers\Staff\Places;

use App\GridMakers\PlacesGridMaker;
use App\Http\Controllers\Controller;
use App\Http\Responders\Staff\GridResponder;
use Illuminate\Http\Request;

class ApiAction extends Controller
{
    public function __construct(private readonly GridResponder $gridResponder, private readonly PlacesGridMaker $placesGridMaker)
    {
    }

    public function __invoke(Request $request)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->placesGridMaker)
            ->response();
    }
}
