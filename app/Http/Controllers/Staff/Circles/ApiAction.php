<?php

namespace App\Http\Controllers\Staff\Circles;

use App\GridMakers\CirclesGridMaker;
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
     * @var CirclesGridMaker
     */
    private $circlesGridMaker;

    public function __construct(
        GridResponder $gridResponder,
        CirclesGridMaker $circlesGridMaker
    ) {
        $this->gridResponder = $gridResponder;
        $this->circlesGridMaker = $circlesGridMaker;
    }

    public function __invoke(Request $request)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->circlesGridMaker)
            ->response();
    }
}
