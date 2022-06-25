<?php

namespace App\Http\Controllers\Circles;

use App\Consts\CircleConsts;
use App\Http\Controllers\Controller;
use App\Services\Utils\DotenvService;
use App\Eloquents\CustomForm;

class CreateAction extends Controller
{
    /**
     * @var DotenvService
     */
    private $dotenvService;

    public function __construct(DotenvService $dotenvService)
    {
        $this->dotenvService = $dotenvService;
    }

    public function __invoke()
    {
        $this->authorize('circle.create');

        $form = CustomForm::getFormByType('circle');
        $should_register_group = $this->dotenvService->shouldRegisterGroup();

        return view('circles.form')
            ->with('form', $form)
            ->with('questions', $form->questions()->get())
            ->with('should_register_group', $should_register_group)
            ->with('attendance_types', CircleConsts::CIRCLE_ATTENDANCE_TYPES_V2);
    }
}
