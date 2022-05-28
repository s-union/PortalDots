<?php

namespace App\Http\Controllers\Staff\Circles\CustomForm;

use App\Http\Controllers\Controller;
use App\Eloquents\Form;
use App\Eloquents\CustomForm;
use App\Services\Utils\DotenvService;
use Illuminate\Support\Facades\DB;

class StoreAction extends Controller
{
    /**
     * @var DotenvService
     */
    private $dotenvService;

    public function __construct(
        DotenvService $dotenvService
    ) {
        $this->dotenvService = $dotenvService;
    }

    public function __invoke()
    {
        return DB::transaction(function () {
            if (!empty(CustomForm::getFormByType('circle'))) {
                return redirect()
                    ->route('staff.circles.custom_form.index')
                    ->with('topAlert.type', 'danger')
                    ->with('topAlert.title', 'すでに企画参加登録機能は有効になっています');
            }

            $form = Form::create([
                'name' => '企画参加登録',
                'open_at' => now()->addWeek(),
                'close_at' => now()->addWeek()->addMonth(),
                'is_public' => false,
            ]);

            CustomForm::create([
                'type' => 'circle',
                'form_id' => $form->id,
            ]);

            $this->dotenvService->saveKeys([
                'PORTAL_USERS_NUMBER_TO_SUBMIT_CIRCLE' => isset(
                    $request->users_number_to_submit_circle
                )
                    ? (string) $request->users_number_to_submit_circle
                    : 1,
                'PORTAL_GROUP_REGISTER_BEFORE_SUBMITTING_CIRCLE' => isset(
                    $request->group_register_before_submitting_circle
                ) && $request->group_register_before_submitting_circle === '1' ? 'true' : 'false'
            ]);

            return redirect()
                    ->route('staff.circles.custom_form.index')
                    ->with('topAlert.title', '企画参加登録機能を有効にしました');
        });
    }
}
