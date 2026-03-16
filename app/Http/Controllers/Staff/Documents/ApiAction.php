<?php

namespace App\Http\Controllers\Staff\Documents;

use App\GridMakers\DocumentsGridMaker;
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
     * @var DocumentsGridMaker
     */
    private $documentsGridMaker;

    public function __construct(
        GridResponder $gridResponder,
        DocumentsGridMaker $documentsGridMaker
    ) {
        $this->gridResponder = $gridResponder;
        $this->documentsGridMaker = $documentsGridMaker;
    }

    public function __invoke(Request $request)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->documentsGridMaker)
            ->response();
    }
}
