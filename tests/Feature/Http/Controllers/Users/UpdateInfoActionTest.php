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

    public function test_update_info_catches_rfc_compliance_exception_and_redirects_back()
    {
        $user = User::factory()->create([
            'email' => 'old@example.com',
            'univemail_domain_part' => config('portal.univemail_domain_part')[0] ?? 'ed.tus.ac.jp',
            'password' => bcrypt('password123'),
        ]);
        $user->univemail_local_part = $user->student_id; // match local part with student_id
        $user->save();

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
                'email' => 'new@example.com', // changed email triggers sendToEmail
                'univemail_local_part' => $user->student_id,
                'univemail_domain_part' => config('portal.univemail_domain_part')[0] ?? 'ed.tus.ac.jp',
                'tel' => '09012345678',
                'password' => 'password123',
            ]);

        $response->assertRedirect(route('user.edit'));
        $response->assertSessionHasErrors(['student_id']);
    }
}
