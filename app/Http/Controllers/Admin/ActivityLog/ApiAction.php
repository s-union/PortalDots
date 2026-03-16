<?php

namespace App\Http\Controllers\Admin\ActivityLog;

use App\GridMakers\ActivityLogGridMaker;
use App\Http\Controllers\Controller;
use App\Http\Responders\Staff\GridResponder;
use Illuminate\Http\Request;

class ApiAction extends Controller
{
    public function __construct(private readonly GridResponder $gridResponder, private readonly ActivityLogGridMaker $activityLogGridMaker)
    {
    }

    public function __invoke(Request $request)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->activityLogGridMaker)
            ->response();
    }
}
