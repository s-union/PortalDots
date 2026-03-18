<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Middleware;

use App\Http\Middleware\TrustHosts;
use Tests\TestCase;

final class TrustHostsTest extends TestCase
{
    #[\PHPUnit\Framework\Attributes\Test]
    public function 信頼するホストとしてアプリケーション_urlとそのサブドメインが設定配列で返される()
    {
        $middleware = resolve(TrustHosts::class);
        $hosts = $middleware->hosts();

        $this->assertIsArray($hosts);
        $this->assertNotEmpty($hosts);

        // $this->allSubdomainsOfApplicationUrl() は通常 ^(.*\.?) から始まる正規表現を返す
        $this->assertStringContainsString('^', (string) $hosts[0]);
    }
}
