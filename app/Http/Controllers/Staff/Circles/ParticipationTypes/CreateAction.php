<?php

namespace App\Http\Controllers\Staff\Circles\ParticipationTypes;

use App\Http\Controllers\Controller;

class CreateAction extends Controller
{
    public function __invoke()
    {
        return view('staff.circles.participation_types.create');
    }
}
