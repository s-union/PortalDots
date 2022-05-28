<?php

namespace App\Http\Controllers\Groups;

use App\Http\Controllers\Controller;

class CreateAction extends Controller
{
    public function __invoke()
    {
        $this->authorize('group.create');

        return view('groups.form');
    }
}
