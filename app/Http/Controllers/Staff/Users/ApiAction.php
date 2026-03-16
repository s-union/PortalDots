<?php

namespace App\Http\Controllers\Staff\Users;

use App\GridMakers\UsersGridMaker;
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
     * @var UsersGridMaker
     */
    private $usersGridMaker;

    public function __construct(
        GridResponder $gridResponder,
        UsersGridMaker $usersGridMaker
    ) {
        $this->gridResponder = $gridResponder;
        $this->usersGridMaker = $usersGridMaker;
    }

    public function __invoke(Request $request)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->usersGridMaker)
            ->response();
    }
}
