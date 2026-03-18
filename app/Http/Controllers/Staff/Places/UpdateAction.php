<?php

namespace App\Http\Controllers\Staff\Places;

use App\Eloquents\Place;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Places\PlaceRequest;

class UpdateAction extends Controller
{
    public function __invoke(PlaceRequest $request, Place $place)
    {
        $validated = $request->validated();

        $place->name = $validated['name'];
        $place->type = $validated['type'];
        $place->notes = $validated['notes'];
        $place->save();

        return back()
            ->with('topAlert.title', '場所を更新しました');
    }
}
