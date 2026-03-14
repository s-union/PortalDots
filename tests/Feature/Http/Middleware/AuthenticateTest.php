<?php

namespace Tests\Feature\Http\Middleware;

use App\Http\Middleware\Authenticate;
use Illuminate\Http\Request;
use Tests\TestCase;

class AuthenticateTest extends TestCase
{
    public function test_it_does_not_redirect_when_expecting_json()
    {
        $middleware = new Authenticate(app('auth'));

        $request = Request::create('/test', 'GET');
        $request->headers->set('Accept', 'application/json');

        // It should throw \Illuminate\Auth\AuthenticationException, but we test the redirectTo behavior directly via reflection
        $method = new \ReflectionMethod(Authenticate::class, 'redirectTo');
        $method->setAccessible(true);
        $result = $method->invoke($middleware, $request);

        $this->assertNull($result);
    }
}
