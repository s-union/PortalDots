<?php

namespace App\Http\Controllers\Circles;

use App\Eloquents\Circle;
use App\Http\Controllers\Controller;
use App\Http\Requests\Circles\CircleRequest;
use App\Services\Circles\CirclesService;
use App\Services\Forms\AnswersService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateAction extends Controller
{
    public function __construct(private readonly CirclesService $circlesService, private readonly AnswersService $answersService)
    {
    }

    public function __invoke(CircleRequest $request, Circle $circle)
    {
        $this->authorize('circle.update', $circle);

        if (! Auth::user()->isLeaderInCircle($circle)) {
            abort(403);
        }

        activity()->disableLogging();

        DB::transaction(function () use ($request, $circle) {
            $this->circlesService->update(
                circle: $circle,
                name: $request->name,
                name_yomi: $request->name_yomi,
                group_name: $request->group_name,
                group_name_yomi: $request->group_name_yomi
            );

            $participationFormAnswer = $circle->getParticipationFormAnswer();

            $circle->touch();

            if (empty($participationFormAnswer)) {
                $this->answersService->createAnswer(
                    form: $circle->participationType->form,
                    circle: $circle,
                    request: $request
                );
            } else {
                $this->answersService->updateAnswer(
                    form: $circle->participationType->form,
                    answer: $participationFormAnswer,
                    request: $request
                );
            }
        });

        activity()->enableLogging();

        if ($circle->can_change_group_name) {
            return to_route('circles.users.index', ['circle' => $circle]);
        } else {
            return to_route('circles.confirm', ['circle' => $circle]);
        }
    }
}
