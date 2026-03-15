<?php

namespace Tests\Feature\Http\Middleware;

use App\Http\Middleware\TrustHosts;
use Illuminate\Http\Request;
use Tests\TestCase;

class TrustHostsTest extends TestCase
{
    /**
     * @test
     */
    public function 信頼するホストとしてアプリケーションUrlとそのサブドメインが設定配列で返される()
    {
        $middleware = app(TrustHosts::class);
        $hosts = $middleware->hosts();

        $this->assertIsArray($hosts);
        $this->assertNotEmpty($hosts);

        // $this->allSubdomainsOfApplicationUrl() は通常 ^(.*\.?) から始まる正規表現を返す
        $this->assertStringContainsString('^', $hosts[0]);
    }
}
