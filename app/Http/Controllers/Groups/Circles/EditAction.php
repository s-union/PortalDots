<?php

namespace App\Http\Controllers\Groups\Circles;

use App\Eloquents\CustomForm;
use App\Eloquents\Group;
use App\Http\Controllers\Controller;
use App\Services\Utils\DotenvService;
use Illuminate\Support\Facades\Auth;

class EditAction extends Controller
{
    /**
     * @var DotenvService
     */
    private $dotenvService;

    public function __construct(DotenvService $dotenvService)
    {
        $this->dotenvService = $dotenvService;
    }

    public function __invoke(Group $group)
    {
        $this->authorize('circle.update', $group->circle());

        if (!Auth::user()->isLeaderInGroup($group)) {
            abort(403);
        }

        $should_register_group_before_submitting_circle =
            $this->dotenvService->getValue(
                'PORTAL_GROUP_REGISTER_BEFORE_SUBMITTING_CIRCLE'
            ) === 'true';

        $answer = $group->select([
            'food_booth',
            'seller_booth',
            'exh_seller_booth',
            'exh_booth'
        ])->first();
        $values = [
            'answer-food' => old('answer-food', $answer['food_booth'] === null ? 'いいえ' : 'はい'),
            'answer-food-booth' => (string) old('answer-food-booth', $answer['food_booth']),
            'answer-seller' => old('answer-seller', $answer['seller_booth'] === null ? 'いいえ' : 'はい'),
            'answer-seller-booth' => (string) old('answer-seller-booth', $answer['seller_booth']),
            'answer-exh-seller' => old('answer-exh-seller', $answer['exh_seller_booth'] === null ? 'いいえ' : 'はい'),
            'answer-exh-seller-booth' => (string) old('answer-exh-seller-booth', $answer['exh_seller_booth']),
            'answer-exh' => old('answer-exh', $answer['exh_booth'] === null ? 'いいえ' : 'はい'),
            'answer-exh-booth' => (string) old('answer-exh-booth', $answer['exh_booth'])
        ];

        return view('circles.form')
            ->with('values', $values)
            ->with('should_register_group_before_submitting_circle', $should_register_group_before_submitting_circle)
            ->with('group', $group);
    }
}
