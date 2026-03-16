<?php

namespace App\Http\Controllers\Contacts;

use App\Eloquents\ContactCategory;
use App\Http\Controllers\Controller;
use App\Services\Circles\SelectorService;

class CreateAction extends Controller
{
    public function __construct(private readonly SelectorService $selectorService)
    {
    }

    public function __invoke()
    {
        return view('contacts.form')
            ->with('circle', $this->selectorService->getCircle())
            ->with('categories', ContactCategory::all());
    }
}
