<?php

namespace App\Http\Controllers\Staff\Forms\Editor;

use App\Eloquents\Form;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Forms\Editor\UpdateQuestionRequest;
use App\Services\Forms\QuestionsService;

class UpdateQuestionAction extends Controller
{
    public function __construct(private readonly QuestionsService $questionsService)
    {
    }

    public function __invoke(Form $form, UpdateQuestionRequest $request)
    {
        $question_id = (int) $request->question['id'];
        $question = $request->question;
        unset($question['created_at'], $question['updated_at'], $question['id']);

        $this->questionsService->updateQuestion(
            $question_id,
            $question
        );
    }
}
