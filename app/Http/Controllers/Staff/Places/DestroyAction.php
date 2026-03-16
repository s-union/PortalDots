<?php

namespace App\Http\Controllers\Staff\Places;

use App\Eloquents\Place;
use App\Http\Controllers\Controller;

class DestroyAction extends Controller
{
    public function __invoke(Place $place)
    {
        $place->delete();

        return redirect()
            ->route('staff.places.index')
            ->with('topAlert.title', '場所を削除しました');
    }
}
