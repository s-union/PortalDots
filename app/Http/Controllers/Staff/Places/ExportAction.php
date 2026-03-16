<?php

namespace App\Http\Controllers\Staff\Places;

use App\Exports\PlacesExport;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;

class ExportAction extends Controller
{
    public function __invoke()
    {
        $now = \Illuminate\Support\Facades\Date::now()->format('Y-m-d_H-i-s');

        return Excel::download(new PlacesExport, "場所一覧_{$now}.csv");
    }
}
