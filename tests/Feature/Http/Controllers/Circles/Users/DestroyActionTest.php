<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Circles\Users;

use App\Eloquents\Answer;
use App\Eloquents\Circle;
use App\Eloquents\User;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Http\Controllers\Circles\BaseTestCase;

final class DestroyActionTest extends BaseTestCase
{
    use RefreshDatabase;

    private $user;

    private $circle;

    private $nonLeader;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->circle = Circle::factory()->notSubmitted()->create([
            'participation_type_id' => $this->participationType->id,
        ]);
        $answer = Answer::factory()->create([
            'form_id' => $this->participationForm->id,
            'circle_id' => $this->circle->id,
        ]);

        $this->user->circles()->attach($this->circle->id, ['is_leader' => true]);

        // 受付期間内
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));

        // メンバー
        $this->nonLeader = User::factory()->create();
        $this->nonLeader->circles()->attach($this->circle->id, ['is_leader' => false]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function リーダーではないメンバーが自分自身を削除することができる()
    {
        $this->assertDatabaseHas('circle_user', [
            'circle_id' => $this->circle->id,
            'user_id' => $this->nonLeader->id,
        ]);

        $response = $this
            ->actingAs($this->nonLeader)
            ->delete(
                route('circles.users.destroy', [
                    'circle' => $this->circle,
                    'user' => $this->nonLeader,
                ])
            );

        $this->assertDatabaseMissing('circle_user', [
            'circle_id' => $this->circle->id,
            'user_id' => $this->nonLeader,
        ]);

        $response->assertStatus(302);
        $response->assertRedirect(route('home'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function リーダーが別のメンバーを削除する()
    {
        $this->assertDatabaseHas('circle_user', [
            'circle_id' => $this->circle->id,
            'user_id' => $this->nonLeader->id,
        ]);

        $response = $this
            ->actingAs($this->user)
            ->delete(
                route('circles.users.destroy', [
                    'circle' => $this->circle,
                    'user' => $this->nonLeader,
                ])
            );

        $this->assertDatabaseMissing('circle_user', [
            'circle_id' => $this->circle->id,
            'user_id' => $this->nonLeader->id,
        ]);

        $response->assertStatus(302);
        $response->assertRedirect(route('circles.users.index', ['circle' => $this->circle]));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function リーダーは自分自身を削除できない()
    {
        $response = $this
            ->actingAs($this->user)
            ->delete(
                route('circles.users.destroy', [
                    'circle' => $this->circle,
                    'user' => $this->user,
                ])
            );

        $this->assertDatabaseHas('circle_user', [
            'circle_id' => $this->circle->id,
            'user_id' => $this->user->id,
            'is_leader' => true,
        ]);

        $response->assertStatus(302);
        $response->assertRedirect(route('circles.users.index', ['circle' => $this->circle]));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 部外者は企画のメンバーを削除できない()
    {
        $anotherUser = User::factory()->create();

        $response = $this
            ->actingAs($anotherUser)
            ->delete(
                route('circles.users.destroy', [
                    'circle' => $this->circle,
                    'user' => $this->nonLeader,
                ])
            );

        $this->assertDatabaseHas('circle_user', [
            'circle_id' => $this->circle->id,
            'user_id' => $this->nonLeader->id,
        ]);

        $response->assertStatus(403);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 提出済みの企画のメンバーは削除できない()
    {
        $this->circle->submitted_at = now();
        $this->circle->save();

        $response = $this
            ->actingAs($this->user)
            ->delete(
                route('circles.users.destroy', [
                    'circle' => $this->circle,
                    'user' => $this->nonLeader,
                ])
            );

        $this->assertDatabaseHas('circle_user', [
            'circle_id' => $this->circle->id,
            'user_id' => $this->nonLeader->id,
        ]);

        $response->assertStatus(403);
    }
}
