<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Forms\Answers;

use App\Eloquents\Circle;
use App\Eloquents\Form;
use App\Eloquents\Tag;
use App\Eloquents\User;
use App\Services\Circles\SelectorService;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

final class CreateActionTest extends TestCase
{
    use RefreshDatabase;

    private $user;

    private $circle;

    private $form;

    /**
     * @var SelectorService
     */
    private $selectorService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->circle = Circle::factory()->create();
        $this->form = Form::factory()->create([
            'open_at' => new CarbonImmutable('2020-01-26 11:42:51'),
            'close_at' => new CarbonImmutable('2020-03-26 15:23:31'),
        ]);

        $this->user->circles()->attach($this->circle->id, ['is_leader' => true]);

        $this->selectorService = App::make(SelectorService::class);
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('受付期間中かどうかに応じて表示が切り替わる_provider')]
    #[\PHPUnit\Framework\Attributes\Test]
    public function 受付期間中かどうかに応じて表示が切り替わる(
        CarbonImmutable $today,
        bool $is_answerable
    ) {
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone($today);
        CarbonImmutable::setTestNowAndTimezone($today);

        $this->selectorService->setCircle($this->circle);

        $response = $this
            ->actingAs($this->user)
            ->get(
                route('forms.answers.create', [
                    'form' => $this->form,
                ])
            );

        $response->assertStatus(200);

        if ($is_answerable) {
            $response->assertDontSee('受付期間外');
        } else {
            $response->assertSee('受付期間外');
        }
    }

    public static function 受付期間中かどうかに応じて表示が切り替わる_provider(): \Iterator
    {
        yield '受付開始はまだまだ先' => [new CarbonImmutable('2019-12-25 23:42:22'), false];
        yield '受付開始前' => [new CarbonImmutable('2020-01-26 11:42:50'), false];
        yield '受付開始した瞬間' => [new CarbonImmutable('2020-01-26 11:42:51'), true];
        yield '受付期間中' => [new CarbonImmutable('2020-02-16 02:25:15'), true];
        yield '受付終了する瞬間' => [new CarbonImmutable('2020-03-26 15:23:31'), true];
        yield '受付終了後' => [new CarbonImmutable('2020-03-26 15:23:32'), false];
        yield '受付終了してだいぶ経過' => [new CarbonImmutable('2020-08-14 02:35:31'), false];
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 非公開のフォームにはアクセスできない()
    {
        $privateForm = Form::factory()->private()->create();

        $this->selectorService->setCircle($this->circle);

        $response = $this
            ->actingAs($this->user)
            ->get(
                route('forms.answers.create', [
                    'form' => $privateForm,
                ])
            );

        $response->assertStatus(404);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 回答可能なタグを持つ企画に所属している場合フォームにアクセスできる()
    {
        $tag = Tag::factory()->create();

        $tagged_circle = Circle::factory()->create();
        $tagged_circle->tags()->attach($tag->id);

        $tagged_form = Form::factory()->create();
        $tagged_form->answerableTags()->attach($tag->id);

        $this->user->circles()->attach($tagged_circle->id, ['is_leader' => true]);

        $this->selectorService->setCircle($tagged_circle);

        $response = $this
            ->actingAs($this->user)
            ->get(
                route('forms.answers.create', [
                    'form' => $tagged_form,
                ])
            );

        $response->assertStatus(200);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 回答可能なタグを持つ企画に所属していない場合フォームにアクセスできない()
    {
        $tag = Tag::factory()->create();

        $tagged_circle = Circle::factory()->create();

        // フォームとは別にタグを企画に紐付ける
        $tagged_circle->tags()->attach(Tag::factory()->create());

        $tagged_form = Form::factory()->create();
        $tagged_form->answerableTags()->attach($tag->id);

        $this->user->circles()->attach($tagged_circle->id, ['is_leader' => true]);

        $this->selectorService->setCircle($tagged_circle);

        $response = $this
            ->actingAs($this->user)
            ->get(
                route('forms.answers.create', [
                    'form' => $tagged_form,
                ])
            );

        $response->assertStatus(403);
    }
}
