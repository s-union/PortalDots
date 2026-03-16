<?php

namespace App\Http\Controllers\Staff\Forms\Answers;

use App\Eloquents\Answer;
use App\Eloquents\Form;
use App\Http\Controllers\Controller;
use App\Services\Forms\AnswerDetailsService;
use App\Services\Forms\AnswersService;

class EditAction extends Controller
{
    public function __construct(private readonly AnswersService $answersService, private readonly AnswerDetailsService $answerDetailsService)
    {
    }

    public function __invoke(Form $form, Answer $answer)
    {
        if ((int) $form->id !== (int) $answer->form_id) {
            abort(404);

            return;
        }

        $circle = $answer->circle()->submitted()->firstOrFail();

        return view('staff.forms.answers.form')
            ->with('circle', $circle)
            ->with('form', $form)
            ->with('questions', $form->questions()->get())
            ->with('answers', $this->answersService->getAnswersByCircle($form, $circle))
            ->with('answer', $answer)
            ->with('answer_details', $this->answerDetailsService->getAnswerDetailsByAnswer($answer));
    }
}
