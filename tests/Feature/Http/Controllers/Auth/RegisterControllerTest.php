<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Auth;

use App\Services\Auth\EmailService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Mockery\MockInterface;
use Symfony\Component\Mime\Exception\RfcComplianceException;
use Tests\TestCase;

final class RegisterControllerTest extends TestCase
{
    use RefreshDatabase;

    #[\PHPUnit\Framework\Attributes\Test]
    public function ユーザー登録画面が正しく表示されるか()
    {
        $response = $this->get(route('register'));
        $response->assertStatus(200);
        $response->assertViewIs('users.register');
    }

    // ユーザーが登録しようとした際に、入力されたメールアドレスがRFC（インターネット標準規格）に違反していてメール送信エラーが起きた場合
    // 正しく登録をキャンセルしてエラーメッセージと共に元の画面へ戻されるか
    public function 登録処理でRFC違反の例外を捕捉し、元の画面へリダイレクトする()
    {
        Event::fake([Registered::class]);

        $this->mock(EmailService::class, function (MockInterface $mock) {
            $mock->shouldReceive('sendAll')
                ->once()
                ->andThrow(new RfcComplianceException('Invalid email'));
        });

        $response = $this->from(route('register'))->post(route('register'), [
            'student_id' => '1234567890',
            'name' => 'テスト ユーザー',
            'name_yomi' => 'てすと ゆーざー',
            'email' => 'test@example.com',
            'univemail_local_part' => '1234567890',
            'univemail_domain_part' => config('portal.univemail_domain_part')[0] ?? 'ed.tus.ac.jp',
            'tel' => '09012345678',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertRedirect(route('register'));
        $response->assertSessionHasErrors(['student_id']);

        $this->assertDatabaseMissing('users', [
            'student_id' => '1234567890',
        ]);
    }
}
