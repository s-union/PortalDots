<?php

namespace App\Http\Controllers\Staff\Places;

use App\Eloquents\Place;
use App\Http\Controllers\Controller;

class EditAction extends Controller
{
    public function __invoke(Place $place)
    {
        return view('staff.places.form')
            ->with('place', $place);
    }
}
