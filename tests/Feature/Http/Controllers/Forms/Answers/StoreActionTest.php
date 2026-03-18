<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Forms\Answers;

use App\Eloquents\Circle;
use App\Eloquents\Form;
use App\Eloquents\ParticipationType;
use App\Eloquents\Tag;
use App\Eloquents\User;
use App\Services\Circles\SelectorService;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

final class StoreActionTest extends TestCase
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

    #[\PHPUnit\Framework\Attributes\DataProvider('受付期間中かどうかに応じてリクエストを許可する_provider')]
    #[\PHPUnit\Framework\Attributes\Test]
    public function 受付期間中かどうかに応じてリクエストを許可する(
        CarbonImmutable $today,
        bool $is_answerable
    ) {
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone($today);
        CarbonImmutable::setTestNowAndTimezone($today);

        $response = $this
            ->actingAs($this->user)
            ->post(
                route('forms.answers.store', [
                    'form' => $this->form,
                ]),
                [
                    'circle_id' => $this->circle->id,
                ]
            );

        if ($is_answerable) {
            $this->assertDatabaseHas('answers', [
                'form_id' => $this->form->id,
                'circle_id' => $this->circle->id,
            ]);
            // バリデーションエラーがなければ編集画面へリダイレクトする
            $response->assertStatus(302);
        } else {
            $this->assertDatabaseMissing('answers', [
                'form_id' => $this->form->id,
                'circle_id' => $this->circle->id,
            ]);
            $response->assertStatus(403);
        }
    }

    public static function 受付期間中かどうかに応じてリクエストを許可する_provider(): \Iterator
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
    public function 参加登録フォームとして登録されているフォームには回答できない()
    {
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));

        $participationForm = Form::factory()->create([
            'type' => 'circle',
        ]);

        ParticipationType::factory()->create([
            'form_id' => $participationForm->id,
        ]);

        $response = $this
            ->actingAs($this->user)
            ->post(
                route('forms.answers.store', [
                    'form' => $participationForm->id,
                ]),
                [
                    'circle_id' => $this->circle->id,
                ]
            );

        $this->assertDatabaseMissing('answers', [
            'form_id' => $participationForm->id,
            'circle_id' => $this->circle->id,
        ]);

        $response->assertStatus(404);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 非公開のフォームには回答できない()
    {
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));

        $privateForm = Form::factory()->private()->create();

        $response = $this
            ->actingAs($this->user)
            ->post(
                route('forms.answers.store', [
                    'form' => $privateForm,
                ]),
                [
                    'circle_id' => $this->circle->id,
                ]
            );

        $this->assertDatabaseMissing('answers', [
            'form_id' => $privateForm->id,
            'circle_id' => $this->circle->id,
        ]);

        $response->assertStatus(403);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 他企画に成り済ました回答はできない()
    {
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));

        $anotherCircle = Circle::factory()->create();

        $response = $this
            ->actingAs($this->user)
            ->post(
                route('forms.answers.store', [
                    'form' => $this->form,
                ]),
                [
                    'circle_id' => $anotherCircle->id,
                ]
            );

        $this->assertDatabaseMissing('answers', [
            'form_id' => $this->form->id,
            'circle_id' => $anotherCircle->id,
        ]);

        $response->assertStatus(403);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 参加登録が不受理となった企画は回答できない()
    {
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));

        $rejectedCircle = Circle::factory()->rejected()->create();
        $this->user->circles()->attach($rejectedCircle->id, ['is_leader' => true]);

        $response = $this
            ->actingAs($this->user)
            ->post(
                route('forms.answers.store', [
                    'form' => $this->form,
                ]),
                [
                    'circle_id' => $rejectedCircle->id,
                ]
            );

        $this->assertDatabaseMissing('answers', [
            'form_id' => $this->form->id,
            'circle_id' => $rejectedCircle->id,
        ]);

        $response->assertStatus(404);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 回答可能なタグを持つ企画に所属している場合回答できる()
    {
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));

        $tag = Tag::factory()->create();

        $tagged_circle = Circle::factory()->create();
        $tagged_circle->tags()->attach($tag->id);

        $tagged_form = Form::factory()->create();
        $tagged_form->answerableTags()->attach($tag->id);

        $this->user->circles()->attach($tagged_circle->id, ['is_leader' => true]);

        // StoreActionではselectorServiceでsetしたcircleではなく、
        // フォーム内で POST された circle_id で回答を保存することを確かめるため、
        // $tagged_circle ではなく $this->circle を set する
        $this->selectorService->setCircle($this->circle);

        $response = $this
            ->actingAs($this->user)
            ->post(
                route('forms.answers.store', [
                    'form' => $tagged_form,
                ]),
                [
                    'circle_id' => $tagged_circle->id,
                ]
            );

        $this->assertDatabaseHas('answers', [
            'form_id' => $tagged_form->id,
            'circle_id' => $tagged_circle->id,
        ]);

        $response->assertStatus(302);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 回答可能なタグを持つ企画に所属していない場合回答できない()
    {
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2020-02-16 02:25:15'));

        $tag = Tag::factory()->create();

        $tagged_circle = Circle::factory()->create();

        // フォームとは別にタグを企画に紐付ける
        $tagged_circle->tags()->attach(Tag::factory()->create());

        $tagged_form = Form::factory()->create();
        $tagged_form->answerableTags()->attach($tag->id);

        $this->user->circles()->attach($tagged_circle->id, ['is_leader' => true]);

        // StoreActionではselectorServiceでsetしたcircleではなく、
        // フォーム内で POST された circle_id で回答を保存することを確かめるため、
        // $tagged_circle ではなく $this->circle を set する
        $this->selectorService->setCircle($this->circle);

        $response = $this
            ->actingAs($this->user)
            ->post(
                route('forms.answers.store', [
                    'form' => $tagged_form,
                ]),
                [
                    'circle_id' => $tagged_circle->id,
                ]
            );

        $this->assertDatabaseMissing('answers', [
            'form_id' => $tagged_form->id,
            'circle_id' => $tagged_circle->id,
        ]);

        $response->assertStatus(403);
    }
}
