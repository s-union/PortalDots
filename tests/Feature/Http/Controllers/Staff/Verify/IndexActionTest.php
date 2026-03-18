<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Verify;

use App\Eloquents\User;
use App\Notifications\Auth\StaffAuthNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

final class IndexActionTest extends TestCase
{
    use RefreshDatabase;

    #[\PHPUnit\Framework\Attributes\Test]
    public function スタッフ認証メールが送信される()
    {
        Notification::fake();

        /** @var User */
        $staff = User::factory()->staff()->create();

        $this->actingAs($staff)->get(route('staff.verify.index'));

        Notification::assertSentTo(
            [$staff],
            StaffAuthNotification::class
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function デモモードの場合はスタッフモードホームへリダイレクトされる()
    {
        Config::set('portal.enable_demo_mode', true);
        Notification::fake();

        /** @var User */
        $staff = User::factory()->staff()->create();

        $response = $this->actingAs($staff)->get(route('staff.verify.index'));

        $response->assertRedirect(route('staff.index'));

        // スタッフ認証メールは送信されない
        Notification::assertNotSentTo(
            [$staff],
            StaffAuthNotification::class
        );
    }
}
