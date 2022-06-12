<?php

namespace App\Http\Controllers\Circles;

use App\Services\Utils\DotenvService;
use Auth;
use App\Http\Controllers\Controller;
use App\Eloquents\Circle;
use App\Eloquents\CustomForm;
use App\Services\Forms\AnswerDetailsService;

class ConfirmAction extends Controller
{
    /**
     * @var AnswerDetailsService
     */
    private $answerDetailsService;

    /**
     * @var DotenvService
     */
    private $dotenvService;

    public function __construct(AnswerDetailsService $answerDetailsService, DotenvService $dotenvService)
    {
        $this->answerDetailsService = $answerDetailsService;
        $this->dotenvService = $dotenvService;
    }

    public function __invoke(Circle $circle)
    {
        $this->authorize('circle.update', $circle);

        if (!Auth::user()->isLeaderInCircle($circle)) {
            abort(403);
        }

        $should_register_group = $this->dotenvService->shouldRegisterGroup();
        if (!$should_register_group && !$circle->canSubmit()) {
            return redirect()
                ->route('circles.users.index', ['circle' => $circle])
                ->with('topAlert.type', 'danger')
                ->with('topAlert.title', '参加登録に必要な人数が揃っていないため、参加登録の提出はまだできません');
        }

        $circle->load('users');

        $form = CustomForm::getFormByType('circle');
        $answer = !empty($form) ? $circle->getCustomFormAnswer() : null;

        return view('circles.confirm')
            ->with('circle', $circle)
            ->with('form', $form)
            ->with('questions', !empty($form) ? $form->questions()->get() : null)
            ->with('answer', $answer)
            ->with('answer_details', !empty($answer)
                ? $this->answerDetailsService->getAnswerDetailsByAnswer($answer) : [])
            ->with('should_register_group', $should_register_group);
    }
}
