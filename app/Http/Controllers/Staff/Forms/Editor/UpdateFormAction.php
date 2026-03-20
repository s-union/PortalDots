<?php

namespace App\Http\Controllers\Staff\Forms\Editor;

use App\Eloquents\Form;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Forms\Editor\UpdateFormRequest;
use App\Services\Forms\FormEditorService;

class UpdateFormAction extends Controller
{
    public function __construct(private readonly FormEditorService $formEditorService)
    {
    }

    public function __invoke(Form $form, UpdateFormRequest $request)
    {
        $validated = $request->validated();
        $input = $validated['form'];

        // 参加登録フォームのフォーム情報は修正禁止
        if (isset($form->participationType)) {
            return abort(400);
        }

        $this->formEditorService->updateForm(
            $form->id,
            $input
        );
    }
}
