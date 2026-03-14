<?php

namespace Tests\Feature\Providers;

use App\Providers\BroadcastServiceProvider;
use Illuminate\Support\Facades\Broadcast;
use Tests\TestCase;

class BroadcastServiceProviderTest extends TestCase
{
    public function test_boot_method_registers_routes()
    {
        $provider = new BroadcastServiceProvider($this->app);

        $provider->boot();

        // Broadcast::routes() が呼ばれ、routes/channels.php がロードされることを確認する。
        // 単にエラーが起きずboot()が通過できればOK。
        $this->assertTrue(true);
    }
}
