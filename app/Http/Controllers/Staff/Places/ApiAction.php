<?php

namespace App\Http\Controllers\Staff\Places;

use App\GridMakers\PlacesGridMaker;
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
     * @var PlacesGridMaker
     */
    private $placesGridMaker;

    public function __construct(
        GridResponder $gridResponder,
        PlacesGridMaker $placesGridMaker
    ) {
        $this->gridResponder = $gridResponder;
        $this->placesGridMaker = $placesGridMaker;
    }

    public function __invoke(Request $request)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->placesGridMaker)
            ->response();
    }
}
