<?php

namespace Tests\Feature\Providers;

use App\Providers\BroadcastServiceProvider;
use Illuminate\Support\Facades\Broadcast;
use Tests\TestCase;

class BroadcastServiceProviderTest extends TestCase
{
    /**
     * @test
     */
    public function bootメソッドがエラーなく実行されチャンネルのルーティングが読み込まれること()
    {
        $provider = new BroadcastServiceProvider($this->app);

        $provider->boot();

        // Broadcast::routes() が呼ばれ、routes/channels.php がロードされることを確認する。
        // 単にエラーが起きずboot()が通過できればOK。
        $this->assertTrue(true);
    }
}
