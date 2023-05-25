<?php

namespace App\Http\Controllers\Circles;

use App\Eloquents\Circle;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Eloquents\ParticipationType;
use Illuminate\Support\Facades\Auth;

class CreateAction extends Controller
{
    public function __invoke(Request $request)
    {
        if (empty($request->participation_type)) {
            abort(404);
        }

        $participationType = ParticipationType::findOrFail($request->participation_type);

        $this->authorize('circle.create', $participationType);

        if (Auth::user()->circles->count() > 0) {
            /** @var Circle $circle */
            $circle = Auth::user()->circles->first();
            return view('circles.form')
                ->with('participation_type', $participationType)
                ->with('form', $participationType->form)
                ->with('questions', $participationType->form->questions()->get())
                ->with('default_group', [
                    'group_name' => $circle->group_name,
                    'group_name_yomi' => $circle->group_name_yomi
                ]);
        } else {
            return view('circles.form')
                ->with('participation_type', $participationType)
                ->with('form', $participationType->form)
                ->with('questions', $participationType->form->questions()->get());
        }
    }
}
