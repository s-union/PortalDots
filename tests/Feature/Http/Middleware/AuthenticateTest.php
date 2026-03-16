<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Middleware;

use App\Http\Middleware\Authenticate;
use Illuminate\Http\Request;
use Tests\TestCase;

final class AuthenticateTest extends TestCase
{
    #[\PHPUnit\Framework\Attributes\Test]
    public function jsonを要求するリクエストの場合はログイン画面へリダイレクトするための_ur_lを返さずnullを返す()
    {
        $middleware = new Authenticate(resolve('auth'));

        $request = Request::create('/test', 'GET');
        $request->headers->set('Accept', 'application/json');

        // 通常は \Illuminate\Auth\AuthenticationException がスローされますが、
        // ここではリフレクションを使用して redirectTo の挙動自体を直接テストしています。
        $method = new \ReflectionMethod(Authenticate::class, 'redirectTo');
        $result = $method->invoke($middleware, $request);

        $this->assertNull($result);
    }
}
