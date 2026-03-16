<?php

namespace App\Http\Controllers\Admin\ActivityLog;

use App\GridMakers\ActivityLogGridMaker;
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
     * @var ActivityLogGridMaker
     */
    private $activityLogGridMaker;

    public function __construct(
        GridResponder $gridResponder,
        ActivityLogGridMaker $activityLogGridMaker
    ) {
        $this->gridResponder = $gridResponder;
        $this->activityLogGridMaker = $activityLogGridMaker;
    }

    public function __invoke(Request $request)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->activityLogGridMaker)
            ->response();
    }
}
