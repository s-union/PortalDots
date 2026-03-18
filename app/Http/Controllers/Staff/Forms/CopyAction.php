<?php

namespace App\Http\Controllers\Staff\Forms;

use App\Eloquents\Form;
use App\Http\Controllers\Controller;
use App\Services\Forms\FormsService;

class CopyAction extends Controller
{
    /**
     * @var FormsService
     */
    public $formsService;

    public function __construct(FormsService $formsService)
    {
        $this->formsService = $formsService;
    }

    public function __invoke(Form $form)
    {
        $this->formsService->copyForm($form);

        return to_route('staff.forms.index')
            ->with('topAlert.title', 'フォームを複製しました');
    }
}
