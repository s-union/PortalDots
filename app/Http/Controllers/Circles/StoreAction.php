<?php

namespace App\Http\Controllers\Circles;

use App\Eloquents\Tag;
use App\Http\Controllers\Controller;
use App\Http\Requests\Circles\CircleRequest;
use App\Services\Circles\CirclesService;
use App\Services\Forms\AnswersService;
use App\Eloquents\CustomForm;
use App\Services\Utils\DotenvService;
use Illuminate\Http\Request;
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

    /**
     * @var DotenvService
     */
    private $dotenvService;

    public function __construct(
        CirclesService $circlesService,
        AnswersService $answersService,
        DotenvService  $dotenvService)
    {
        $this->circlesService = $circlesService;
        $this->answersService = $answersService;
        $this->dotenvService = $dotenvService;
    }

    public function __invoke(CircleRequest $request)
    {
        $this->authorize('circle.create');

        activity()->disableLogging();

        $should_register_group = $this->dotenvService->shouldRegisterGroup();
        $result = DB::transaction(function () use ($request, $should_register_group) {
            if ($should_register_group) {
                $leader = Auth::user();
                $group = $leader->groups->first();
                // 企画作成
                $circle = $this->circlesService->create(
                    $leader,
                    $request->name,
                    $request->name_yomi,
                    $group->group_name,
                    $group->group_name_yomi
                );
                $circle->update([
                    'attendance_type' => $request->answer_attendance_type
                ]);

                // 理大祭係の追加
                foreach ($group->members as $member) {
                    $circle->users()->attach($member->id);
                }

                // タグの追加
                $tag = Tag::where('name', $request->answer_attendance_type)->first();
                $circle->tags()->attach($tag->id);
            } else {
                $circle = $this->circlesService->create(
                    Auth::user(),
                    $request->name,
                    $request->name_yomi,
                    $request->group_name,
                    $request->group_name_yomi
                );
            }

            $this->answersService->createAnswer(
                CustomForm::getFormByType('circle'),
                $circle,
                $request
            );

            if ($should_register_group) {
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
