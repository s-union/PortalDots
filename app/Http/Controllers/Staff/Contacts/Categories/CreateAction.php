<?php

namespace App\Http\Controllers\Staff\Contacts\Categories;

use App\Http\Controllers\Controller;

class CreateAction extends Controller
{
    public function __invoke()
    {
        return view('staff.contacts.categories.form');
    }
}
