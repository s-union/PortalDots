<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Services\Utils\ReleaseInfoService;

class AboutAction extends Controller
{
    public function __construct(private readonly ReleaseInfoService $releaseInfoService)
    {
    }

    public function __invoke()
    {
        return view('staff.about')
            ->with('current_version_info', $this->releaseInfoService->getCurrentVersion())
            ->with('latest_release', $this->releaseInfoService->getReleaseOfLatestVersionWithinSameMajorVersion());
    }
}
