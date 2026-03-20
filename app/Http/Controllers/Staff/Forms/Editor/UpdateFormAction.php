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
        // バリデーション済みデータのみを受け取り、想定外のキー混入を防ぐ
        $validated = $request->validated();
        $input = $validated['form'];

        // 参加登録フォームのフォーム情報は修正禁止
        if (isset($form->participationType)) {
            return abort(400);
        }

        // ルートバインド済みの Form を正として更新対象を確定する
        $this->formEditorService->updateForm(
            $form->id,
            $input
        );
    }
}
