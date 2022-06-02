<?php

namespace App\Http\Controllers\Circles;

use App\Consts\CircleConsts;
use App\Http\Controllers\Controller;
use App\Eloquents\Circle;
use App\Eloquents\CustomForm;
use App\Services\Forms\AnswerDetailsService;
use App\Services\Utils\DotenvService;
use Illuminate\Support\Facades\Auth;

class EditAction extends Controller
{
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
        $this->authorize('circle.update', $circle);

        if (!Auth::user()->isLeaderInCircle($circle)) {
            abort(403);
        }

        $form = CustomForm::getFormByType('circle');
        $answer = $circle->getCustomFormAnswer();
        return view('circles.form')
            ->with('circle', $circle)
            ->with('form', $form)
            ->with('questions', $form->questions()->get())
            ->with('answer', $answer)
            ->with('answer_details', $this->answerDetailsService->getAnswerDetailsByAnswer($answer))
            ->with('should_register_group', $this->dotenvService->shouldRegisterGroup())
            ->with('attendance_types', CircleConsts::CIRCLE_ATTENDANCE_TYPES_V1);
    }
}
