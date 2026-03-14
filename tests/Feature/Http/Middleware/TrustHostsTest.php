<?php

namespace Tests\Feature\Http\Middleware;

use App\Http\Middleware\TrustHosts;
use Illuminate\Http\Request;
use Tests\TestCase;

class TrustHostsTest extends TestCase
{
    public function test_hosts_returns_array_with_application_url()
    {
        $middleware = app(TrustHosts::class);
        $hosts = $middleware->hosts();

        $this->assertIsArray($hosts);
        $this->assertNotEmpty($hosts);

        // $this->allSubdomainsOfApplicationUrl() usually returns a regex pattern starting with ^(.*\.?)
        $this->assertStringContainsString('^', $hosts[0]);
    }
}
