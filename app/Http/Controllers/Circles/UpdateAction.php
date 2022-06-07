<?php

namespace App\Http\Controllers\Circles;

use App\Eloquents\Tag;
use App\Http\Controllers\Controller;
use App\Http\Requests\Circles\CircleRequest;
use App\Services\Circles\CirclesService;
use App\Services\Forms\AnswersService;
use App\Eloquents\Circle;
use App\Eloquents\CustomForm;
use App\Services\Utils\DotenvService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateAction extends Controller
{
    /**
     * @var CirclesService
     */
    private $circlesService;

    /**
     * @var AnswersService
     */
    private $answersService;

    /**
     * @var DotenvService
     */
    private $dotenvService;

    public function __construct(
        CirclesService $circlesService,
        AnswersService $answersService,
        DotenvService $dotenvService
    ) {
        $this->circlesService = $circlesService;
        $this->answersService = $answersService;
        $this->dotenvService = $dotenvService;
    }

    public function __invoke(CircleRequest $request, Circle $circle)
    {
        $this->authorize('circle.update', $circle);

        if (!Auth::user()->isLeaderInCircle($circle)) {
            abort(403);
        }

        activity()->disableLogging();

        $should_register_group = $this->dotenvService->shouldRegisterGroup();

        DB::transaction(function () use ($request, $circle, $should_register_group) {
            if ($should_register_group) {
                $this->circlesService->update(
                    $circle,
                    $request->name,
                    $request->name_yomi,
                    $circle->group_name,
                    $circle->group_name_yomi
                );
                $circle->update([
                    'attendance_type' => $request->answer_attendance_type
                ]);
                $circle->tags()->detach();
                $tag = Tag::where('name', $request->answer_attendance_type)->first();
                $circle->tags()->attach($tag->id);
            } else {
                $this->circlesService->update(
                    $circle,
                    $request->name,
                    $request->name_yomi,
                    $request->group_name,
                    $request->group_name_yomi
                );
            }

            $custom_form_answer = $circle->getCustomFormAnswer();

            if (empty($custom_form_answer)) {
                $this->answersService->createAnswer(
                    CustomForm::getFormByType('circle'),
                    $circle,
                    $request
                );
            } else {
                $this->answersService->updateAnswer(
                    CustomForm::getFormByType('circle'),
                    $custom_form_answer,
                    $request
                );
            }
        });

        activity()->enableLogging();

        if ($should_register_group) {
            return redirect()
                ->route('circles.confirm', ['circle' => $circle]);
        }

        return redirect()
            ->route('circles.users.index', ['circle' => $circle]);
    }
}
