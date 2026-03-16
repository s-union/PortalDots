<?php

namespace App\Http\Controllers\Install\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Install\PortalRequest;
use App\Services\Install\PortalService;

class UpdateAction extends Controller
{
    public function __construct(private readonly PortalService $portalService)
    {
    }

    public function __invoke(PortalRequest $request)
    {
        $info = $request->all();
        $info['APP_FORCE_HTTPS'] = isset($info['APP_FORCE_HTTPS']) && $info['APP_FORCE_HTTPS'] === '1'
            ? 'true' : 'false';
        $this->portalService->updateInfo($info);

        return to_route('install.database.edit');
    }
}
