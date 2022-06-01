<?php

namespace App\Http\Controllers\Circles;

use App\Eloquents\Tag;
use App\Http\Controllers\Controller;
use App\Services\Circles\CirclesService;
use App\Services\Forms\AnswersService;
use App\Eloquents\CustomForm;
use App\Services\Utils\DotenvService;
use Exception;
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

    public function __invoke(Request $request)
    {
        $this->authorize('circle.create');

        activity()->disableLogging();

        $should_register_group_before_submitting_circle =
            $this->dotenvService->getValue(
                'PORTAL_GROUP_REGISTER_BEFORE_SUBMITTING_CIRCLE'
            ) === 'true';

        if ($should_register_group_before_submitting_circle) {
            app()->make('App\Http\Requests\Circles\CircleWithGroupRequest');

            $group = Auth::user()->groups->first();
            $group->update([
                'food_booth' => $request['answer-food'] === 'はい' ? intval($request['answer-food-booth']) : null,
                'seller_booth' => $request['answer-seller'] === 'はい' ? intval($request['answer-seller-booth']) : null,
                'exh_seller_booth' => $request['answer-exh-seller'] === 'はい' ? intval($request['answer-exh-seller-booth']) : null,
                'exh_booth' => $request['answer-exh'] === 'はい' ? intval($request['answer-exh-booth']) : null
            ]);

            if ($group->circle()) {
                $group->circle()->delete();
            }

            $leader = $group->leader->first();

            $circle = $this->circlesService->create(
                $leader,
                $group->group_name,
                $group->group_name_yomi,
                $group->group_name,
                $group->group_name_yomi
            );
            foreach ($group->members as $member) {
                $this->circlesService->addMember(
                    $circle,
                    $member
                );
            }
            foreach (
                [
                    'answer-food' => '飲食販売',
                    'answer-seller' => '物品販売',
                    'answer-exh-seller' => '展示・実演(収入あり)',
                    'answer-exh' => '展示・実演(収入なし)',
                ] as $param => $str_name) {
                if ($request->$param === 'はい') {
                    $tag = Tag::where('name', $str_name)->first();
                    if (empty($tag)) {
                        throw new Exception("TagsSeederを実行してください.");
                    }
                    $circle->tags()->attach($tag->id);
                }
            }

            /*
            foreach (
                [
                    'answer-food' => ['飲食販売', 'いんしょくはんばい'],
                    'answer-seller' => ['物品販売', 'ぶっぴんはんばい'],
                    'answer-exh-seller' => ['展示・実演(収入あり)', 'てんじじつえんしゅうにゅうあり'],
                    'answer-exh' => ['展示・実演(収入なし)', 'てんじじつえんしゅうにゅうなし']
                ] as $param => $str_name) {

                $tag = Tag::where('name', $str_name)->first();
                if (empty($tag)) {
                    throw new Exception("TagsSeederを実行してください.");
                }

                if ($request->$param === 'はい') {
                    if ($request[$param . '-booth'] === '1') {
                        $name = $group->group_name . '(' . $str_name[0] . ')';
                        $name_yomi = $group->group_name_yomi . '(' . $str_name[1] . ')';
                        $circle = $this->circlesService->create(
                            $leader,
                            $name,
                            $name_yomi,
                            $group->group_name,
                            $group->group_name_yomi
                        );
                        foreach ($group->members as $member) {
                            $this->circlesService->addMember(
                                $circle,
                                $member
                            );
                        }
                        $circle->tags()->attach($tag->id);
                    } else {
                        for ($i = 1; $i <= intval($request[$param . '-booth']); $i++) {
                            $name = $group->group_name . '(' . $str_name[0] . ') - ' . $i;
                            $name_yomi = $group->group_name_yomi . '(' . $str_name[1] . ')';
                            $circle = $this->circlesService->create(
                                $leader,
                                $name,
                                $name_yomi,
                                $group->group_name,
                                $group->group_name_yomi
                            );
                            foreach ($group->members as $member) {
                                $this->circlesService->addMember(
                                    $circle,
                                    $member
                                );
                            }
                            $circle->tags()->attach($tag->id);
                        }
                    }
                }
            }
            */
            return redirect()
                ->route('groups.circles.confirm', ['group' => $group]);

        } else {
            app()->make('App\Http\Requests\Circles\CircleRequest');
            $result = DB::transaction(function () use ($request) {
                $circle = $this->circlesService->create(
                    Auth::user(),
                    $request->name,
                    $request->name_yomi,
                    $request->group_name,
                    $request->group_name_yomi
                );

                $this->answersService->createAnswer(
                    CustomForm::getFormByType('circle'),
                    $circle,
                    $request
                );

                return redirect()
                    ->route('circles.users.index', ['circle' => $circle]);
            });
        }

        activity()->enableLogging();

        return $result;
    }
}
