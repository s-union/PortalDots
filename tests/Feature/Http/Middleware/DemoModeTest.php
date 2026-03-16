<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Middleware;

use App\Eloquents\User;
use App\Http\Middleware\DemoMode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

final class DemoModeTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var DemoMode
     */
    private $demoMode;

    protected function setUp(): void
    {
        parent::setUp();
        $this->demoMode = App::make(DemoMode::class);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function handle_デモモードではない場合は_ge_t以外のリクエストも許可する()
    {
        /** @var User */
        $user = User::factory()->create();

        $this->actingAs($user);

        $request = Request::create(route('contacts.post'), 'POST');

        $response = $this->demoMode->handle($request, fn() => 'handled!');

        $this->assertSame('handled!', $response);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function handle_デモモードの場合は_ge_t以外のリクエストを拒否()
    {
        Config::set('portal.enable_demo_mode', true);

        /** @var User */
        $user = User::factory()->create();

        $this->actingAs($user);

        $request = Request::create(route('contacts.post'), 'POST');

        $response = $this->demoMode->handle($request, function () {});

        $testResponse = $this->createTestResponse($response, $request);

        $testResponse->assertRedirect();
    }
}
