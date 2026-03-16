<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Circles;

use App\Eloquents\Circle;
use App\Eloquents\Form;
use App\Eloquents\ParticipationType;
use App\Eloquents\Tag;
use App\Eloquents\User;
use App\Mail\Circles\ApprovedMailable;
use App\Mail\Circles\RejectedMailable;
use App\Mail\Circles\SubmittedMailable;
use App\Services\Circles\CirclesService;
use App\Services\Tags\Exceptions\DenyCreateTagsException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

final class CirclesServiceTest extends TestCase
{
    use RefreshDatabase;

    private const PARTICIPATION_TYPE_TAGS_COUNT = 12;

    private ?CirclesService $circlesService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->circlesService = App::make(CirclesService::class);
    }

    private function createCircle()
    {
        $participationForm = Form::factory()->create();
        $participationType = ParticipationType::factory()->create([
            'form_id' => $participationForm->id,
        ]);
        $tags = Tag::factory(self::PARTICIPATION_TYPE_TAGS_COUNT)->create();
        $participationType->tags()->attach($tags->pluck('id'));

        $leader = User::factory()->create();
        $name = 'サンプル模擬店';
        $name_yomi = 'サンプルもぎてん';
        $group_name = 'サンプル研究会';
        $group_name_yomi = 'サンプルけんきゅうかい';

        return [
            $this->circlesService->create(
                participationType: $participationType,
                leader: $leader,
                name: $name,
                name_yomi: $name_yomi,
                group_name: $group_name,
                group_name_yomi: $group_name_yomi
            ),
            $leader,
            $name,
            $name_yomi,
            $group_name,
            $group_name_yomi,
        ];
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function create()
    {
        [
            $circle,
            $leader,
            $name,
            $name_yomi,
            $group_name,
            $group_name_yomi
        ] = $this->createCircle();

        $this->assertDatabaseHas('circles', [
            'name' => $name,
            'name_yomi' => 'さんぷるもぎてん',  // カタカナはひらがなに変換される
            'group_name' => $group_name,
            'group_name_yomi' => 'さんぷるけんきゅうかい',  // カタカナはひらがなに変換される
        ]);

        $this->assertDatabaseHas('circle_user', [
            'circle_id' => $circle->id,
            'user_id' => $leader->id,
            'is_leader' => 1,
        ]);

        // 参加種別に紐づくタグは、企画を作成したタイミングでは企画に紐づかない
        $this->assertDatabaseCount('circle_tag', 0);

        $this->assertNotEmpty($circle->invitation_token);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update()
    {
        [
            $circle,
            $leader,
            $name,
            $name_yomi,
            $group_name,
            $group_name_yomi
        ] = $this->createCircle();

        $this->circlesService->update(
            $circle,
            $name,
            'あたらしいキカクめいしょう',
            $group_name,
            $group_name_yomi
        );

        $this->assertDatabaseHas('circles', [
            'name_yomi' => 'あたらしいきかくめいしょう',  // カタカナはひらがなに変換される
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function regenerate_invitation_token()
    {
        [
            $circle,
            $leader,
            $name,
            $name_yomi,
            $group_name,
            $group_name_yomi
        ] = $this->createCircle();

        $this->assertNotEmpty($circle->invitation_token);

        $old_token = $circle->invitation_token;

        $this->circlesService->regenerateInvitationToken($circle);

        $circle->refresh();

        $this->assertNotSame($old_token, $circle->invitation_token);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function add_member()
    {
        [
            $circle,
            $leader,
            $name,
            $name_yomi,
            $group_name,
            $group_name_yomi
        ] = $this->createCircle();

        $new_user = User::factory()->create();

        $this->circlesService->addMember($circle, $new_user);

        $this->assertDatabaseHas('circle_user', [
            'circle_id' => $circle->id,
            'user_id' => $new_user->id,
            'is_leader' => 0,
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function submit()
    {
        [
            $circle,
            $leader,
            $name,
            $name_yomi,
            $group_name,
            $group_name_yomi
        ] = $this->createCircle();

        $this->assertEmpty($circle->submitted_at);

        $this->circlesService->submit($circle);

        $circle->refresh();
        $this->assertNotEmpty($circle->submitted_at);

        // 参加種別に紐づくタグが、自動的に企画に紐づく
        $this->assertDatabaseCount('circle_tag', self::PARTICIPATION_TYPE_TAGS_COUNT);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function save_tags()
    {
        // 予め tag テーブルに登録されているタグ
        Tag::create([
            'name' => '登録済みタグ',
        ]);

        [
            $circle,
            $leader,
            $name,
            $name_yomi,
            $group_name,
            $group_name_yomi
        ] = $this->createCircle();

        $this->circlesService->saveTags($circle, [
            '新しいタグ1',
            '登録済みタグ',
            '新しいタグ2',
        ], true, User::factory()->create());

        // 「登録済みタグ」は tags テーブルに 1 つしか存在しないかチェック
        // (saveTags 実行時、改めて「登録済みタグ」が新規作成されないことをチェック)
        $this->assertSame(1, Tag::where('name', '登録済みタグ')->count());

        $circle->refresh();

        $this->assertEquals(
            [
                '登録済みタグ',
                '新しいタグ1',
                '新しいタグ2',
            ],
            $circle->tags->pluck('name')->all()
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function save_tags_タグの新規作成が許可されていない場合は例外が発生する()
    {
        $this->expectException(DenyCreateTagsException::class);

        // 予め tag テーブルに登録されているタグ
        Tag::create([
            'name' => '登録済みタグ',
        ]);

        [
            $circle,
            $leader,
            $name,
            $name_yomi,
            $group_name,
            $group_name_yomi
        ] = $this->createCircle();

        $this->circlesService->saveTags($circle, [
            '新しいタグ1',
            '登録済みタグ',
            '新しいタグ2',
        ], false, User::factory()->create());
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function send_submited_email()
    {
        $leader = User::factory()->create();
        $circle = Circle::factory()->create();

        $circle->users()->attach($leader, ['is_leader' => true]);

        Mail::fake();
        $this->circlesService->sendSubmitedEmail($leader, $circle);

        Mail::assertSent(SubmittedMailable::class, fn($mail) => $mail->hasTo($leader->email));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function send_approved_email()
    {
        $leader = User::factory()->create();
        $circle = Circle::factory()->create();

        $circle->users()->attach($leader, ['is_leader' => true]);

        Mail::fake();
        $this->circlesService->sendApprovedEmail($leader, $circle);

        Mail::assertSent(ApprovedMailable::class, fn($mail) => $mail->hasTo($leader->email));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function send_rejected_email()
    {
        $leader = User::factory()->create();
        $circle = Circle::factory()->create();

        $circle->users()->attach($leader, ['is_leader' => true]);

        Mail::fake();
        $this->circlesService->sendRejectedEmail($leader, $circle);

        Mail::assertSent(RejectedMailable::class, fn($mail) => $mail->hasTo($leader->email));
    }
}
