<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers;

use App\Eloquents\Circle;
use App\Eloquents\Form;
use App\Eloquents\Page;
use App\Eloquents\ParticipationType;
use App\Eloquents\User;
use App\Services\Utils\DotenvService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class HomeActionTest extends TestCase
{
    use RefreshDatabase;

    #[\PHPUnit\Framework\Attributes\Test]
    public function 未インストール状態の場合はインストーラが表示される()
    {
        $this->mock(DotenvService::class, function ($mock) {
            // boolean の true ではなく、文字列の 'true' である点に注意
            $mock->shouldReceive('getValue')->once()->with('APP_NOT_INSTALLED', 'false')->andReturn('true');
        });

        $response = $this->get(route('home'));
        $response->assertRedirect(route('install.index'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 未ログイン状態でログイン画面への導線が表示される()
    {
        $response = $this->get(route('home'));
        $response->assertStatus(200);

        $response->assertSee('home-header');
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function メール認証が未完了の時アラートが表示される()
    {
        $user = User::factory()->not_verified()->create();

        $response = $this->actingAs($user)->get(route('home'));

        $response->assertSee('メール認証');
        $response->assertSee('もっと詳しく');
        $response->assertSee($user->email);
        $response->assertSee($user->univemail);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function メール認証完了済の場合はアラートを表示しない()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('documents.index'));

        $response->assertDontSee('メール認証');
        $response->assertDontSee('確認メールを再送');
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 非公開のお知らせは一覧に表示されない()
    {
        // 固定されたお知らせ
        $pinnedPrivatePageTitle = 'this is a pinned private page';
        $pinnedPublicPageTitle = 'this is a pinned public page';

        // 通常のお知らせ
        $privatePageTitle = 'this is a private page';
        $publicPageTitle = 'this is a public form';

        Page::factory()->create([
            'title' => $pinnedPrivatePageTitle,
            'is_pinned' => true,
            'is_public' => false,
        ]);
        Page::factory()->create([
            'title' => $pinnedPublicPageTitle,
            'is_pinned' => true,
            'is_public' => true,
        ]);
        Page::factory()->create([
            'title' => $privatePageTitle,
            'is_public' => false,
        ]);
        Page::factory()->create([
            'title' => $publicPageTitle,
            'is_public' => true,
        ]);

        $response = $this->get(route('home'));

        $response->assertDontSee($pinnedPrivatePageTitle);
        $response->assertSee($pinnedPublicPageTitle);
        $response->assertDontSee($privatePageTitle);
        $response->assertSee($publicPageTitle);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 参加登録フォームは一覧に表示されない()
    {
        $participationFormName = 'this is a registration for participation form';
        $normalFormName = 'this is a normal form';

        // 参加登録フォームを作成
        $participationForm = Form::factory()->create([
            'name' => $participationFormName,
        ]);
        ParticipationType::factory()->create([
            'form_id' => $participationForm->id,
        ]);

        // カスタムフォームではない通常のフォームも作成
        Form::factory()->create([
            'name' => $normalFormName,
        ]);

        $circle = Circle::factory()->create();
        $user = User::factory()->create();
        $user->circles()->attach($circle, ['is_leader' => true]);
        $response = $this->actingAs($user)->get(route('home'));

        $response->assertDontSee($participationFormName);
        $response->assertSee($normalFormName);
    }
}
