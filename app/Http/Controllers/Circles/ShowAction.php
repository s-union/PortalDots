<?php

namespace App\Http\Controllers\Circles;

use App\Eloquents\Circle;
use App\Eloquents\CustomForm;
use App\Http\Controllers\Controller;
use App\Services\Forms\AnswerDetailsService;
use App\Services\Utils\DotenvService;
use Carbon\CarbonImmutable;

class ShowAction extends Controller
{
    /**
     * @var AnswerDetailsService
     */
    private $answerDetailsService;

    /**
     * @var DotenvService
     */
    private $dotenvService;

    public function __construct(
        AnswerDetailsService $answerDetailsService,
        DotenvService $dotenvService
    ) {
        $this->answerDetailsService = $answerDetailsService;
        $this->dotenvService = $dotenvService;
    }

    public function __invoke(Circle $circle)
    {
        $this->authorize('circle.belongsTo', $circle);

        $reauthorized_at = new CarbonImmutable(session()->get('user_reauthorized_at'));

        if (
            !$circle->hasSubmitted()
            || (session()->has('user_reauthorized_at') && $reauthorized_at->addHours(2)->gte(now()))
        ) {
            $circle->load('users', 'places');

            $form = CustomForm::getFormByType('circle');
            $answer = !empty($form) ? $circle->getCustomFormAnswer() : null;

            return view('circles.show')
                ->with('circle', $circle)
                ->with('form', $form)
                ->with('questions', !empty($form) ? $form->questions()->get() : null)
                ->with('answer', $answer)
                ->with('answer_details', !empty($answer)
                    ? $this->answerDetailsService->getAnswerDetailsByAnswer($answer) : [])
                ->with('should_register_group', $this->dotenvService->shouldRegisterGroup());
        }
        return redirect()
            ->route('circles.auth', ['circle' => $circle]);
    }
}
