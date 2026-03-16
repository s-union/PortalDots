<?php

namespace App\Http\Controllers\Staff\Forms;

use App\Eloquents\Form;
use App\Http\Controllers\Controller;

class DestroyAction extends Controller
{
    public function __invoke(Form $form)
    {
        $form->delete();

        return redirect()
            ->route('staff.forms.index')
            ->with('topAlert.title', 'フォームを削除しました');
    }
}
