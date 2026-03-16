<?php

namespace App\Http\Controllers\Admin\Portal;

use App\Http\Controllers\Controller;
use App\Services\Install\PortalService;

class EditAction extends Controller
{
    public function __construct(private readonly PortalService $portalService)
    {
    }

    public function __invoke()
    {
        return view('admin.portal.form')
            ->with('portal', $this->portalService->getInfo());
    }
}
