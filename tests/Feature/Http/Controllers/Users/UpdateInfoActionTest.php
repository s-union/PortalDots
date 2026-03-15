<?php

namespace Tests\Feature\Http\Controllers\Users;

use Tests\TestCase;
use App\Eloquents\User;
use App\Services\Auth\EmailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Symfony\Component\Mime\Exception\RfcComplianceException;
use Mockery\MockInterface;

class UpdateInfoActionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @test
     */
    public function ユーザー情報更新時にメールアドレスがRFC違反だった場合、元の画面にエラー付きでリダイレクトされる()
    {
        $user = User::factory()->create([
            'email' => 'old@example.com',
            'univemail_domain_part' => config('portal.univemail_domain_part')[0] ?? 'ed.tus.ac.jp',
            'password' => bcrypt('password123'),
        ]);
        $user->univemail_local_part = $user->student_id; // ローカルパートを学籍番号と一致させる
        $user->save();

        // 意図的にRFC違反の例外を発生させるように、EmailServiceをモック（偽装）する
        $this->mock(EmailService::class, function (MockInterface $mock) {
            $mock->shouldReceive('sendToEmail')
                ->once()
                ->andThrow(new RfcComplianceException('Invalid email'));
        });

        $response = $this->actingAs($user)
            ->from(route('user.edit'))
            ->patch(route('user.update'), [
                'name' => 'テスト ユーザー',
                'name_yomi' => 'てすと ゆーざー',
                'student_id' => $user->student_id,
                'email' => 'new@example.com', // メールアドレスを変更することでsendToEmail内の処理を発火させる
                'univemail_local_part' => $user->student_id,
                'univemail_domain_part' => config('portal.univemail_domain_part')[0] ?? 'ed.tus.ac.jp',
                'tel' => '09012345678',
                'password' => 'password123',
            ]);

        $response->assertRedirect(route('user.edit'));
        $response->assertSessionHasErrors(['student_id']);
    }
}
