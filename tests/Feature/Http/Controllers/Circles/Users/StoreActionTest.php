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

final class StoreActionTest extends BaseTestCase
{
    use RefreshDatabase;

    private ?Circle $circle;

    private ?User $nonLeader = null;

    protected function setUp(): void
    {
        parent::setUp();

        $user = User::factory()->create();
        $this->circle = Circle::factory()->notSubmitted()->create([
            'participation_type_id' => $this->participationType->id,
        ]);
        $answer = Answer::factory()->create([
            'form_id' => $this->participationForm->id,
            'circle_id' => $this->circle->id,
        ]);

        $user->circles()->attach($this->circle->id, ['is_leader' => true]);

        // 受付期間内
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 正しいトークンであれば招待を受け入れることができる()
    {
        $invitedUser = User::factory()->create();

        $this->assertDatabaseMissing('circle_user', [
            'circle_id' => $this->circle->id,
            'user_id' => $invitedUser->id,
        ]);

        $response = $this
            ->actingAs($invitedUser)
            ->post(
                route('circles.users.store', [
                    'circle' => $this->circle,
                ]),
                [
                    'invitation_token' => $this->circle->invitation_token,
                ]
            );

        $this->assertDatabaseHas('circle_user', [
            'circle_id' => $this->circle->id,
            'user_id' => $invitedUser->id,
            'is_leader' => false,
        ]);

        $response->assertStatus(302);
        $response->assertRedirect(route('circles.show', ['circle' => $this->circle]));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 間違ったトークンでは企画のメンバーになれない()
    {
        $invitedUser = User::factory()->create();

        $response = $this
            ->actingAs($invitedUser)
            ->post(
                route('circles.users.store', [
                    'circle' => $this->circle,
                ]),
                [
                    'invitation_token' => 'INVALID_WRONG_TOKEN',
                ]
            );

        $this->assertDatabaseMissing('circle_user', [
            'circle_id' => $this->circle->id,
            'user_id' => $invitedUser->id,
        ]);

        $response->assertStatus(404);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 提出済みの企画の招待は受け入れることができない()
    {
        $this->circle->submitted_at = now();
        $this->circle->save();

        $invitedUser = User::factory()->create();

        $response = $this
            ->actingAs($invitedUser)
            ->post(
                route('circles.users.store', [
                    'circle' => $this->circle,
                ]),
                [
                    'invitation_token' => $this->circle->invitation_token,
                ]
            );

        $this->assertDatabaseMissing('circle_user', [
            'circle_id' => $this->circle->id,
            'user_id' => $invitedUser->id,
        ]);

        $response->assertStatus(404);
    }
}
