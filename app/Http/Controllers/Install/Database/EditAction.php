<?php

namespace App\Http\Controllers\Install\Database;

use App\Http\Controllers\Controller;
use App\Services\Install\DatabaseService;

class EditAction extends Controller
{
    public function __construct(private readonly DatabaseService $databaseService)
    {
    }

    public function __invoke()
    {
        return view('install.database.form')
            ->with('labels', $this->databaseService->getFormLabels())
            ->with('database', $this->databaseService->getInfo());
    }
}
