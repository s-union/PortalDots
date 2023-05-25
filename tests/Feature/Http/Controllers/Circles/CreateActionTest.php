<?php

namespace Tests\Feature\Http\Controllers\Circles;

use App\Eloquents\Circle;
use App\Eloquents\User;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;

/** @group hoge */
class CreateActionTest extends BaseTestCase
{
    use RefreshDatabase;

    private $user;

    public function setUp(): void
    {
        parent::setUp();
        $this->user = factory(User::class)->create();

        // 受付期間内
        Carbon::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));
    }

    /**
     * @test
     */
    public function 説明が設定されているときは説明を表示する()
    {
        $this->participationForm->description = '注意事項';
        $this->participationForm->save();

        $responce = $this
            ->actingAs($this->user)
            ->get(
                route('circles.create', ['participation_type' => $this->participationType])
            );

        $responce->assertOk();
        $responce->assertSee('必ずお読みください');
        $responce->assertSee('注意事項');
    }

    /**
     * @test
     */
    public function 説明が設定されていないときは説明を表示しない()
    {
        $this->participationForm->description = null;
        $this->participationForm->save();

        $responce = $this
            ->actingAs($this->user)
            ->get(
                route('circles.create', ['participation_type' => $this->participationType])
            );

        $responce->assertOk();
        $responce->assertDontSee('必ずお読みください');
    }

    /** @test */
    public function 最初の提出の際には団体名を入力できる()
    {
        $response = $this
            ->actingAs($this->user)
            ->get(
                route('circles.create', ['participation_type' => $this->participationType])
            );

        $response->assertDontSee('理大祭実行委員会');
    }

    /** @test */
    public function 最初の提出では確認画面に遷移する表示とはならない()
    {
        $response = $this
            ->actingAs($this->user)
            ->get(
                route('circles.create', ['participation_type' => $this->participationType])
            );

        $response->assertDontSee('確認画面へ');
    }

    /** @test */
    public function ２回目以降の提出の際には先に提出した企画の団体名が入力されている()
    {
        $circle = factory(Circle::class)->create();
        $circle->leader()->attach($this->user->id);

        $response = $this
            ->actingAs($this->user)
            ->get(
                route('circles.create', ['participation_type' => $this->participationType])
            );

        $response->assertSee($circle->group_name);
        $response->assertSee($circle->group_name_yomi);
    }

    /** @test */
    public function ２回目以降の提出では確認画面に遷移する表示となる()
    {
        $circle = factory(Circle::class)->create();
        $circle->leader()->attach($this->user->id);

        $response = $this
            ->actingAs($this->user)
            ->get(
                route('circles.create', ['participation_type' => $this->participationType])
            );

        $response->assertSee('確認画面へ');
    }
}
