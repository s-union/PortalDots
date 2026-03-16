<?php

namespace App\Http\Controllers\Staff\Forms;

use App\GridMakers\FormsGridMaker;
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
     * @var FormsGridMaker
     */
    private $formsGridMaker;

    public function __construct(
        GridResponder $gridResponder,
        FormsGridMaker $formsGridMaker
    ) {
        $this->gridResponder = $gridResponder;
        $this->formsGridMaker = $formsGridMaker;
    }

    public function __invoke(Request $request)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->formsGridMaker)
            ->response();
    }
}
