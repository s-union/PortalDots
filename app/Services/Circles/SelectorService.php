<?php

declare(strict_types=1);

namespace App\Services\Circles;

use App\Eloquents\Circle;
use App\Eloquents\User;
use Illuminate\Database\Eloquent\Collection;

/**
 * ログイン先の企画を変更・取得するためのサービス
 * ログイン可能な企画は,ユーザーが属している「すべての」企画とする
 */
class SelectorService
{
    public const SESSION_KEY_CIRCLE_ID = 'selector_service__circle_id';

    /**
     * @var array|null
     */
    private $selectableCircles = null;

    /**
     * @var Circle|null
     */
    private $circle = null;

    /**
     * ユーザーが選択可能な企画の一覧のうち,スタッフによるチェックがApprovedである企画が存在するかどうかを返します
     *
     * @param ?User $user
     * @return bool
     */
    public function approvedSelectableCircleExistsIn(?User $user): bool
    {
        if (empty($user)) {
            return false;
        }
        foreach (self::getSelectableCirclesList($user) as $circle) {
            if ($circle->hasApproved()) {
                return true;
            }
        }
        return false;
    }

    /**
     * ログイン先の企画を選択する画面において、ユーザーが選択可能な企画の一覧を取得
     *
     * @param User $user
     * @return Collection
     */
    public function getSelectableCirclesList(User $user): Collection
    {
        if (empty($this->selectableCircles[$user->id])) {
            $this->selectableCircles[$user->id] = $user->circles()->pendingOrApproved()->get();
        }
        return $this->selectableCircles[$user->id];
    }

    /**
     * CircleSelectorDropdown.vue コンポーネントの circles prop で利用可能な値を取得
     *
     * @param User $user
     * @param string $redirect_to 企画をセットしたあとにリダイレクトする先のURL
     * @return string
     */
    public function getJsonForCircleSelectorDropdown(User $user, string $redirect_to): string
    {
        $circles = $this->getSelectableCirclesList($user);
        return $circles->map(function (Circle $circle) use ($redirect_to) {
            return [
                'id' => $circle->id,
                'name' => $circle->name,
                'group_name' => $circle->group_name,
                'href' => route('circles.selector.set', ['redirect_to' => $redirect_to, 'circle' => $circle]),
            ];
        })->toJson();
    }

    public function setCircle(?Circle $circle = null)
    {
        if (empty($circle)) {
            return;
        }
        session([self::SESSION_KEY_CIRCLE_ID => $circle->id]);
    }

    public function getCircle()
    {
        $circle_id = session(self::SESSION_KEY_CIRCLE_ID, null);

        if (empty($circle_id)) {
            // キャッシュを削除した上で null を返す
            $this->circle = null;
            return null;
        }

        if (empty($this->circle)) {
            $this->circle = Circle::find($circle_id);

            if (empty($this->circle)) {
                $this->reset();
                return null;
            }
        }

        return $this->circle;
    }

    // TODO: Rename this
    public function reset()
    {
        session([self::SESSION_KEY_CIRCLE_ID => null]);
    }
}
