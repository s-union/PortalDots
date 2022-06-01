<?php

namespace App\Services\CircleWithGroups;

use App\Eloquents\CustomForm;
use App\Eloquents\Form;
use App\Services\Forms\QuestionsService;

class CustomFormsService
{
    /**
     * @var QuestionsService
     */
    private $questionsService;

    public function __construct(QuestionsService $questionsService)
    {
        $this->questionsService = $questionsService;
    }

    public function createFormWithCustomForm()
    {
        $form = Form::create([
            'name' => '企画参加登録(団体情報との紐付け)',
            'open_at' => now()->addWeek(),
            'close_at' => now()->addWeek()->addMonth(),
            'is_public' => false,
        ]);

        CustomForm::create([
            'type' => 'circle_with_group',
            'form_id' => $form->id,
        ]);

        $this->createQuestions($form);

        return $form;
    }

    public function createFormWithCustomFormWith(
        $open_at, $close_at, ?bool $is_public, $description
    ) {
        $form = Form::create([
            'name' => '企画参加登録(団体情報との紐付け)',
            'open_at' => $open_at,
            'close_at' => $close_at,
            'is_public' => $is_public ?? false,
            'description' => $description
        ]);

        CustomForm::create([
            'type' => 'circle_with_group',
            'form_id' => $form->id,
        ]);

        return $form;
    }

    public function updateForm(
        $form,
        $open_at, $close_at, ?bool $is_public, $description
    ) {
        $form->update([
            'open_at' => $open_at,
            'close_at' => $close_at,
            'is_public' => $is_public,
            'description' => $description
        ]);
        $form->save();
    }
}
