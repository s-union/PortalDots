<?php

namespace Tests\Feature\Http\Controllers\Install;

use App\Services\Utils\DotenvService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HomeActionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @test
     */
    public function インストール済の場合はアクセスできない()
    {
        $this->mock(DotenvService::class, function ($mock) {
            // boolean の true ではなく、文字列の 'true' である点に注意
            $mock->shouldReceive('getValue')->once()->with('APP_NOT_INSTALLED', 'false')->andReturn('false');
        });

        $response = $this->get(route('install.index'));
        $response->assertStatus(404);
    }

    /**
     * @test
     */
    public function 未インストール状態の場合はアクセスできる()
    {
        $this->mock(DotenvService::class, function ($mock) {
            // boolean の true ではなく、文字列の 'true' である点に注意
            $mock->shouldReceive('getValue')->once()->with('APP_NOT_INSTALLED', 'false')->andReturn('true');
        });

        $response = $this->get(route('install.index'));
        $response->assertStatus(200);
    }
}
