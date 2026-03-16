<?php

namespace App\Http\Controllers\Staff\Documents;

use App\Exports\DocumentsExport;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;

class ExportAction extends Controller
{
    public function __invoke()
    {
        $now = \Illuminate\Support\Facades\Date::now()->format('Y-m-d_H-i-s');

        return Excel::download(new DocumentsExport, "配布資料一覧_{$now}.csv");
    }
}
