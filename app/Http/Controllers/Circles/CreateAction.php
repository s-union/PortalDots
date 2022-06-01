<?php

namespace App\Http\Controllers\Circles;

use App\Http\Controllers\Controller;
use App\Services\Utils\DotenvService;
use Illuminate\Http\Request;
use App\Eloquents\CustomForm;
use Illuminate\Support\Facades\Auth;

class CreateAction extends Controller
{
    /**
     * @var DotenvService;
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
        $circle_with_group_form = CustomForm::getFormByType('circle_with_group');

        $should_register_group_before_submitting_circle =
            $this->dotenvService->getValue(
                'PORTAL_GROUP_REGISTER_BEFORE_SUBMITTING_CIRCLE'
            ) === 'true';
        if ($should_register_group_before_submitting_circle
            && count(Auth::user()->circles) > 0) {
            return redirect()
                ->route('home')
                ->with('topAlert.type', 'danger')
                ->with('topAlert.title', "あなたは既に企画参加登録を行っています。");
        }

        return view('circles.form')
            ->with('form', $form)
            ->with('questions', $form->questions()->get())
            ->with('should_register_group_before_submitting_circle',
                $should_register_group_before_submitting_circle)
            ->with('group', $should_register_group_before_submitting_circle
                ? Auth::user()->groups->first() : null)
            ->with('circle_with_group_form', $circle_with_group_form);
    }
}
