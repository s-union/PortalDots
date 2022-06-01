<?php

namespace App\Http\Controllers\Staff\Circles\CustomForm;

use App\Eloquents\CustomForm;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Circles\CustomFormRequest;
use App\Services\CircleWithGroups\CustomFormsService;
use App\Services\Forms\FormEditorService;
use App\Services\Utils\DotenvService;

class UpdateAction extends Controller
{
    /**
     * @var FormEditorService
     */
    private $formEditorService;

    /**
     * @var DotenvService
     */
    private $dotenvService;

    /**
     * @var CustomFormsService
     */
    private $customFormsService;

    public function __construct(
        FormEditorService $formEditorService,
        DotenvService     $dotenvService,
        CustomFormsService $customFormsService
    )
    {
        $this->formEditorService = $formEditorService;
        $this->dotenvService = $dotenvService;
        $this->customFormsService = $customFormsService;
    }

    public function __invoke(CustomFormRequest $request)
    {
        $form = CustomForm::getFormByType('circle');

        if (empty($form)) {
            abort(404);
        }

        $this->dotenvService->saveKeys([
            'PORTAL_USERS_NUMBER_TO_SUBMIT_CIRCLE' => isset(
                $request->users_number_to_submit_circle
            )
                ? (string)$request->users_number_to_submit_circle
                : 1,
            'PORTAL_GROUP_REGISTER_BEFORE_SUBMITTING_CIRCLE' => isset(
                $request->group_register_before_submitting_circle
            ) && $request->group_register_before_submitting_circle === '1' ? 'true' : 'false'
        ]);

        $this->formEditorService->updateForm($form->id, [
            'open_at' => $request->open_at,
            'close_at' => $request->close_at,
            'is_public' => $request->is_public ?? false,
            'description' => $request->description,
        ]);

        $circle_with_group_form = CustomForm::getFormByType('circle_with_group');
        if ($request->group_register_before_submitting_circle === '1') {
            if (!isset($circle_with_group_form)) {
                $this->customFormsService->createFormWithCustomFormWith(
                    $request->open_at,
                    $request->close_at,
                    $request->is_public,
                    $request->description
                );
            } else {
                $this->customFormsService->updateForm(
                    $circle_with_group_form,
                    $request->open_at,
                    $request->close_at,
                    $request->is_public,
                    $request->description
                );
            }
        }

        return redirect()
            ->route('staff.circles.custom_form.index')
            ->with('topAlert.title', '変更を保存しました');
    }
}
