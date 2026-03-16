<?php

namespace App\Http\Controllers\Staff\Permissions;

use App\GridMakers\PermissionsGridMaker;
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
     * @var PermissionsGridMaker
     */
    private $permissionsGridMaker;

    public function __construct(
        GridResponder $gridResponder,
        PermissionsGridMaker $permissionsGridMaker
    ) {
        $this->gridResponder = $gridResponder;
        $this->permissionsGridMaker = $permissionsGridMaker;
    }

    public function __invoke(Request $request)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->permissionsGridMaker)
            ->response();
    }
}
