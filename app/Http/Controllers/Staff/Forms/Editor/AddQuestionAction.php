<?php

namespace App\Http\Controllers\Staff\Forms\Editor;

use App\Eloquents\Form;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Forms\Editor\AddQuestionRequest;
use App\Services\Forms\QuestionsService;
use Carbon\Carbon;

class AddQuestionAction extends Controller
{
    public function __construct(private readonly QuestionsService $questionsService)
    {
    }

    public function __invoke(Form $form, AddQuestionRequest $request)
    {
        if (config('portal.enable_demo_mode')) {
            return [
                'id' => random_int(100, 9999),
                'name' => '',
                'description' => '',
                'type' => $request->type,
                'is_required' => false,
                'number_min' => null,
                'number_max' => null,
                'allowed_types' => '',
                'priority' => 9999,
                'created_at' => new Carbon,
                'updated_at' => new Carbon,
            ];
        }

        $question = $this->questionsService->addQuestion($form, $request->type);

        return [
            'id' => $question->id,
            'name' => $question->name,
            'description' => $question->description,
            'type' => $question->type,
            'is_required' => $question->is_required,
            'number_min' => $question->number_min,
            'number_max' => $question->number_max,
            'allowed_types' => $question->allowed_types,
            'priority' => $question->priority,
            'created_at' => $question->created_at,
            'updated_at' => $question->updated_at,
        ];
    }
}
