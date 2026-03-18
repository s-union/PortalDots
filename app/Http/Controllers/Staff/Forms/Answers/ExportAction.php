<?php

namespace App\Http\Controllers\Staff\Forms\Answers;

use App\Eloquents\Form;
use App\Exports\AnswersExport;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;

class ExportAction extends Controller
{
    public function __invoke(Form $form)
    {
        $now = \Illuminate\Support\Facades\Date::now()->format('Y-m-d_H-i-s');

        return Excel::download(new AnswersExport($form), "{$form->name}_回答一覧_{$now}.csv");
    }
}
