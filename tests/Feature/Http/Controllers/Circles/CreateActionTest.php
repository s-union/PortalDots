<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Circles;

use App\Eloquents\Circle;
use App\Eloquents\User;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;

#[\PHPUnit\Framework\Attributes\Group('hoge')]
final class CreateActionTest extends BaseTestCase
{
    use RefreshDatabase;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();

        // 受付期間内
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
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

    #[\PHPUnit\Framework\Attributes\Test]
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

    #[\PHPUnit\Framework\Attributes\Test]
    public function 最初の提出の際には団体名を入力できる()
    {
        $response = $this
            ->actingAs($this->user)
            ->get(
                route('circles.create', ['participation_type' => $this->participationType])
            );

        $response->assertDontSee('理大祭実行委員会');
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 最初の提出では確認画面に遷移する表示とはならない()
    {
        $response = $this
            ->actingAs($this->user)
            ->get(
                route('circles.create', ['participation_type' => $this->participationType])
            );

        $response->assertDontSee('確認画面へ');
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function ２回目以降の提出の際には先に提出した企画の団体名が入力されている()
    {
        $circle = Circle::factory()->create();
        $circle->leader()->attach($this->user->id);

        $response = $this
            ->actingAs($this->user)
            ->get(
                route('circles.create', ['participation_type' => $this->participationType])
            );

        $response->assertSee($circle->group_name);
        $response->assertSee($circle->group_name_yomi);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function ２回目以降の提出では確認画面に遷移する表示となる()
    {
        $circle = Circle::factory()->create();
        $circle->leader()->attach($this->user->id);

        $response = $this
            ->actingAs($this->user)
            ->get(
                route('circles.create', ['participation_type' => $this->participationType])
            );

        $response->assertSee('確認画面へ');
    }
}
