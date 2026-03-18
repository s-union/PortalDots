<?php

declare(strict_types=1);

namespace Tests\Feature\Providers;

use Illuminate\Routing\RouteCollection;
use Tests\TestCase;

final class BroadcastServiceProviderTest extends TestCase
{
    #[\PHPUnit\Framework\Attributes\Test]
    public function broadcasting_authルートが読み込まれていること()
    {
        /** @var RouteCollection $routes */
        $routes = app('router')->getRoutes();

        $broadcastAuthRoute = collect($routes->getRoutes())->first(
            fn ($route) => $route->uri() === 'broadcasting/auth'
        );

        $this->assertNotNull($broadcastAuthRoute);
    }
}
