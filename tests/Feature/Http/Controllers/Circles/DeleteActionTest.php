<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Circles;

use App\Eloquents\Answer;
use App\Eloquents\Circle;
use App\Eloquents\User;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;

final class DeleteActionTest extends BaseTestCase
{
    use RefreshDatabase;

    private $user;

    private $circle;

    private $nonLeader;

    private $anotherUser;

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

        // メンバーではない
        $this->anotherUser = User::factory()->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 参加登録未提出であればアクセスできる()
    {
        $response = $this->actingAs($this->user)
            ->get(
                route('circles.delete', [
                    'circle' => $this->circle,
                ])
            );

        $response->assertStatus(200);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function リーダー以外のメンバーはアクセスできない()
    {
        $response = $this->actingAs($this->nonLeader)
            ->get(
                route('circles.delete', [
                    'circle' => $this->circle,
                ])
            );

        $response->assertStatus(403);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 部外者はアクセスできない()
    {
        $response = $this->actingAs($this->anotherUser)
            ->get(
                route('circles.delete', [
                    'circle' => $this->circle,
                ])
            );

        $response->assertStatus(403);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 提出済みの企画は削除できない()
    {
        $this->circle->submitted_at = now();
        $this->circle->save();

        $response = $this->actingAs($this->user)
            ->get(
                route('circles.delete', [
                    'circle' => $this->circle,
                ])
            );

        $response->assertStatus(403);
    }
}
