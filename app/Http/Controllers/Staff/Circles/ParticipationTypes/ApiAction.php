<?php

namespace App\Http\Controllers\Staff\Circles\ParticipationTypes;

use App\Eloquents\ParticipationType;
use App\GridMakers\CirclesGridMaker;
use App\Http\Controllers\Controller;
use App\Http\Responders\Staff\GridResponder;
use Illuminate\Http\Request;

class ApiAction extends Controller
{
    public function __construct(private readonly GridResponder $gridResponder, private readonly CirclesGridMaker $circlesGridMaker)
    {
    }

    public function __invoke(Request $request, ParticipationType $participationType)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker(
                $this->circlesGridMaker
                    ->withParticipationType($participationType)
            )
            ->response();
    }
}
