<?php

namespace App\Http\Controllers\Staff\Forms\Answers;

use App\Eloquents\Form;
use App\GridMakers\AnswersGridMaker;
use App\Http\Controllers\Controller;
use App\Http\Responders\Staff\GridResponder;
use Illuminate\Http\Request;

class ApiAction extends Controller
{
    /**
     * @var GridResponder
     */
    private $gridResponder;

    /**
     * @var AnswersGridMaker
     */
    private $answersGridMaker;

    public function __construct(
        GridResponder $gridResponder,
        AnswersGridMaker $answersGridMaker
    ) {
        $this->gridResponder = $gridResponder;
        $this->answersGridMaker = $answersGridMaker;
    }

    public function __invoke(Request $request, Form $form)
    {
        return $this->gridResponder
            ->setRequest($request)
            ->setGridMaker($this->answersGridMaker->withForm($form))
            ->response();
    }
}
