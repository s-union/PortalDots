<?php

namespace App\Http\Controllers\Forms\Answers;

use App\Eloquents\Answer;
use App\Eloquents\Form;
use App\Http\Controllers\Controller;
use App\Services\Forms\AnswerDetailsService;
use App\Services\Forms\AnswersService;

class EditAction extends Controller
{
    public function __construct(
        private readonly AnswersService $answersService,
        private readonly AnswerDetailsService $answerDetailsService
    ) {
        // 他企画の回答を編集できないようにする
        $this->middleware('can:update,answer');
    }

    public function __invoke(Form $form, Answer $answer)
    {
        if (! $form->is_public || (int) $form->id !== (int) $answer->form_id || isset($form->participationType)) {
            abort(404);

            return;
        }

        $circle = $answer->circle()->approved()->firstOrFail();

        return view('forms.answers.form')
            ->with('circle', $circle)
            ->with('form', $form)
            ->with('questions', $form->questions()->get())
            ->with('answers', $this->answersService->getAnswersByCircle($form, $circle))
            ->with('answer', $answer)
            ->with('answer_details', $this->answerDetailsService->getAnswerDetailsByAnswer($answer));
    }
}
