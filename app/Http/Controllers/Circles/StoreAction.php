<?php

namespace App\Http\Controllers\Circles;

use App\Http\Controllers\Controller;
use App\Http\Requests\Circles\CircleRequest;
use App\Services\Circles\CirclesService;
use App\Services\Forms\AnswersService;
use App\Eloquents\ParticipationType;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class StoreAction extends Controller
{
    /**
     * @var CirclesService
     */
    private $circlesService;

    /**
     * @var AnswersService
     */
    private $answersService;

    public function __construct(CirclesService $circlesService, AnswersService $answersService)
    {
        $this->circlesService = $circlesService;
        $this->answersService = $answersService;
    }

    public function __invoke(CircleRequest $request)
    {
        activity()->disableLogging();

        $participationType = ParticipationType::findOrFail($request->participation_type);

        $this->authorize('circle.create', $participationType);

        $result = DB::transaction(function () use ($request, $participationType) {
            $circle = $this->circlesService->create(
                participationType: $participationType,
                leader: Auth::user(),
                name: $request->name,
                name_yomi: $request->name_yomi,
                group_name: $request->group_name,
                group_name_yomi: $request->group_name_yomi,
                can_change_group_name: Auth::user()->circles->count() == 0
            );

            $this->answersService->createAnswer(
                $participationType->form,
                $circle,
                $request
            );

            if (Auth::user()->circles()->count() > 1) {
                $prev_circle = Auth::user()
                    ->circles()
                    ->first();
                foreach ($prev_circle->users as $user) {
                    if (!$user->pivot->is_leader) {
                        $circle->users()->save($user, ['is_leader' => false]);
                    }
                }
                return redirect()
                    ->route('circles.confirm', ['circle' => $circle]);
            }

            return redirect()
                ->route('circles.users.index', ['circle' => $circle]);
        });

        activity()->enableLogging();

        return $result;
    }
}
