<?php

namespace App\Http\Controllers\Staff\Forms\Editor;

use App\Eloquents\Form;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Forms\Editor\UpdateQuestionsOrderRequest;
use App\Services\Forms\QuestionsService;

class UpdateQuestionsOrderAction extends Controller
{
    public function __construct(private readonly QuestionsService $questionsService)
    {
    }

    public function __invoke(Form $form, UpdateQuestionsOrderRequest $request)
    {
        $this->questionsService->updateQuestionsOrder(
            $form,
            collect($request->questions)->mapWithKeys(fn($question) => [$question['id'] => $question['priority']])->toArray()
        );
    }
}
