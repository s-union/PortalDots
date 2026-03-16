<?php

namespace Tests\Feature\Http\Middleware;

use App\Http\Middleware\Authenticate;
use Illuminate\Http\Request;
use Tests\TestCase;

class AuthenticateTest extends TestCase
{
    /**
     * @test
     */
    public function jsonを要求するリクエストの場合はログイン画面へリダイレクトするための_ur_lを返さずnullを返す()
    {
        $middleware = new Authenticate(app('auth'));

        $request = Request::create('/test', 'GET');
        $request->headers->set('Accept', 'application/json');

        // 通常は \Illuminate\Auth\AuthenticationException がスローされますが、
        // ここではリフレクションを使用して redirectTo の挙動自体を直接テストしています。
        $method = new \ReflectionMethod(Authenticate::class, 'redirectTo');
        $method->setAccessible(true);
        $result = $method->invoke($middleware, $request);

        $this->assertNull($result);
    }
}
