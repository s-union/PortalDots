<?php

namespace Tests\Feature\Services\Circles;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Eloquents\User;
use App\Eloquents\Circle;
use App\Eloquents\Tag;
use App\Services\Circles\CirclesService;
use App\Mail\Circles\ApprovedMailable;
use App\Mail\Circles\RejectedMailable;
use App\Mail\Circles\SubmitedMailable;
use App\Services\Circles\Exceptions\DenyCreateTagsException;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Mail;

class CirclesServiceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var CirclesService
     */
    private $circlesService;

    public function setUp(): void
    {
        parent::setUp();
        $this->circlesService = App::make(CirclesService::class);
    }

    private function createCircle()
    {
        $leader = factory(User::class)->create();
        $name = 'サンプル模擬店';
        $name_yomi = 'サンプルもぎてん';

        return [
            $this->circlesService->create(
                $leader,
                $name,
                $name_yomi,
            ),
            $leader,
            $name,
            $name_yomi,
        ];
    }

    /**
     * @test
     */
    public function create()
    {
        [
            $circle,
            $leader,
            $name,
            $name_yomi,
        ] = $this->createCircle();

        $this->assertDatabaseHas('circles', [
            'name' => $name,
            'name_yomi' => 'さんぷるもぎてん',  // カタカナはひらがなに変換される
        ]);

        $this->assertDatabaseHas('circle_user', [
            'circle_id' => $circle->id,
            'user_id' => $leader->id,
            'is_leader' => 1,
        ]);

        $this->assertNotEmpty($circle->invitation_token);
    }

    /**
     * @test
     */
    public function update()
    {
        [
            $circle,
            $leader,
            $name,
            $name_yomi,
        ] = $this->createCircle();

        $this->circlesService->update(
            $circle,
            $name,
            'あたらしいキカクめいしょう',
        );

        $this->assertDatabaseHas('circles', [
            'name_yomi' => 'あたらしいきかくめいしょう',  // カタカナはひらがなに変換される
        ]);
    }

    /**
     * @test
     */
    public function regenerateInvitationToken()
    {
        [ $circle ] = $this->createCircle();

        $this->assertNotEmpty($circle->invitation_token);

        $old_token = $circle->invitation_token;

        $this->circlesService->regenerateInvitationToken($circle);

        $circle->refresh();

        $this->assertNotSame($old_token, $circle->invitation_token);
    }

    /**
     * @test
     */
    public function addMember()
    {
        [ $circle ] = $this->createCircle();

        $new_user = factory(User::class)->create();

        $this->circlesService->addMember($circle, $new_user);

        $this->assertDatabaseHas('circle_user', [
            'circle_id' => $circle->id,
            'user_id' => $new_user->id,
            'is_leader' => 0,
        ]);
    }

    /**
     * @test
     */
    public function submit()
    {
        [ $circle ] = $this->createCircle();

        $this->assertEmpty($circle->submitted_at);

        $this->circlesService->submit($circle);

        $circle->refresh();
        $this->assertNotEmpty($circle->submitted_at);
    }

    /**
     * @test
     */
    public function saveTags()
    {
        // 予め tag テーブルに登録されているタグ
        Tag::create([
            'name' => '登録済みタグ'
        ]);

        [ $circle ] = $this->createCircle();

        $this->circlesService->saveTags($circle, [
            '新しいタグ1',
            '登録済みタグ',
            '新しいタグ2',
        ], true, factory(User::class)->create());

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

    /**
     * @test
     */
    public function saveTags_タグの新規作成が許可されていない場合は例外が発生する()
    {
        $this->expectException(DenyCreateTagsException::class);

        // 予め tag テーブルに登録されているタグ
        Tag::create([
            'name' => '登録済みタグ'
        ]);

        [ $circle ] = $this->createCircle();

        $this->circlesService->saveTags($circle, [
            '新しいタグ1',
            '登録済みタグ',
            '新しいタグ2',
        ], false, factory(User::class)->create());
    }

    /**
     * @test
     */
    public function sendSubmitedEmail()
    {
        $leader = factory(User::class)->create();
        $circle = factory(Circle::class)->create();

        $circle->users()->attach($leader, ['is_leader' => true]);

        Mail::fake();
        $this->circlesService->sendSubmitedEmail($leader, $circle);

        Mail::assertSent(SubmitedMailable::class, function ($mail) use ($leader) {
            return $mail->hasTo($leader->email);
        });
    }

    /**
     * @test
     */
    public function sendApprovedEmail()
    {
        $leader = factory(User::class)->create();
        $circle = factory(Circle::class)->create();

        $circle->users()->attach($leader, ['is_leader' => true]);

        Mail::fake();
        $this->circlesService->sendApprovedEmail($leader, $circle);

        Mail::assertSent(ApprovedMailable::class, function ($mail) use ($leader) {
            return $mail->hasTo($leader->email);
        });
    }

    /**
     * @test
     */
    public function sendRejectedEmail()
    {
        $leader = factory(User::class)->create();
        $circle = factory(Circle::class)->create();

        $circle->users()->attach($leader, ['is_leader' => true]);

        Mail::fake();
        $this->circlesService->sendRejectedEmail($leader, $circle);

        Mail::assertSent(RejectedMailable::class, function ($mail) use ($leader) {
            return $mail->hasTo($leader->email);
        });
    }
}
