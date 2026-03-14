<?php

namespace Tests\Feature\Http\Controllers\Auth;

use Tests\TestCase;
use App\Services\Auth\EmailService;
use App\Eloquents\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Auth\Events\Registered;
use Symfony\Component\Mime\Exception\RfcComplianceException;
use Mockery\MockInterface;

class RegisterControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_show_registration_form()
    {
        $response = $this->get(route('register'));
        $response->assertStatus(200);
        $response->assertViewIs('users.register');
    }

    public function test_register_catches_rfc_compliance_exception_and_redirects_back()
    {
        Event::fake([Registered::class]);

        $this->mock(EmailService::class, function (MockInterface $mock) {
            $mock->shouldReceive('sendAll')
                ->once()
                ->andThrow(new RfcComplianceException('Invalid email'));
        });

        $response = $this->from(route('register'))->post(route('register'), [
            'student_id' => '1234567890X',
            'name' => 'テスト ユーザー',
            'name_yomi' => 'てすと ゆーざー',
            'email' => 'test@example.com',
            'univemail_local_part' => '1234567890X',
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
