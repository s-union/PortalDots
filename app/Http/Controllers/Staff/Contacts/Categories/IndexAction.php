<?php

namespace App\Http\Controllers\Staff\Contacts\Categories;

use App\Eloquents\ContactCategory;
use App\Http\Controllers\Controller;

class IndexAction extends Controller
{
    public function __invoke()
    {
        return view('staff.contacts.categories.index')
            ->with('categories', ContactCategory::all());
    }
}
