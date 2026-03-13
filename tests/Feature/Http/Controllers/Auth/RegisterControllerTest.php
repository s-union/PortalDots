<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Eloquents\User;
use App\Mail\Auth\EmailVerificationMailable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegisterControllerTest extends TestCase
{
    use RefreshDatabase;

    public function setUp(): void
    {
        parent::setUp();

        Config::set('portal.univemail_local_part', 'student_id');
        Config::set('portal.univemail_domain_part', ['example.ac.jp']);
        Config::set('portal.student_id_name', 'student ID');
        Config::set('portal.univemail_name', 'univemail');
    }

    /**
     * @test
     */
    public function 氏名を分割入力してユーザー登録できる()
    {
        Mail::fake();

        $response = $this->post(route('register'), [
            'student_id' => 'abc12345',
            'name_family' => '山田',
            'name_given' => '太郎',
            'name_family_yomi' => 'やまだ',
            'name_given_yomi' => 'たろう',
            'email' => 'contact@example.com',
            'univemail_local_part' => 'abc12345',
            'univemail_domain_part' => 'example.ac.jp',
            'tel' => '09012345678',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertRedirect(route('verification.notice'));

        /** @var User $user */
        $user = User::query()->where('student_id', 'ABC12345')->firstOrFail();

        $this->assertSame('山田 太郎', $user->name);
        $this->assertSame('やまだ たろう', $user->name_yomi);
        $this->assertAuthenticatedAs($user);

        Mail::assertSent(EmailVerificationMailable::class, 2);
    }
}
