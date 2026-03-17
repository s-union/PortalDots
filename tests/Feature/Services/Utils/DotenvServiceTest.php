<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Utils;

use App\Services\Utils\DotenvService;
use Illuminate\Support\Facades\App;
use Jackiedo\DotenvEditor\DotenvEditor;
use Jackiedo\DotenvEditor\Exceptions\KeyNotFoundException;
use Tests\TestCase;

final class DotenvServiceTest extends TestCase
{
    #[\PHPUnit\Framework\Attributes\Test]
    public function get_value_値が存在すれば取得できる()
    {
        $this->mock(DotenvEditor::class, function ($mock) {
            $mock->shouldReceive('getValue')->once()->with('EXAMPLE_KEY')->andReturn('exampleValue');
        });

        $dotenvService = App::make(DotenvService::class);

        $this->assertSame('exampleValue', $dotenvService->getValue('EXAMPLE_KEY'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function get_value_値が存在しなければデフォルト値を返す()
    {
        $this->mock(DotenvEditor::class, function ($mock) {
            $mock->shouldReceive('getValue')
                ->once()
                ->with('EXAMPLE_KEY')
                ->andThrow(new KeyNotFoundException());
        });

        $dotenvService = App::make(DotenvService::class);

        $this->assertSame('defaultValue', $dotenvService->getValue('EXAMPLE_KEY', 'defaultValue'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function get_value_値が存在せずデフォルト値も未設定の場合はnullを返す()
    {
        $this->mock(DotenvEditor::class, function ($mock) {
            $mock->shouldReceive('getValue')->once()->with('EXAMPLE_KEY')->andThrow(new KeyNotFoundException());
        });

        $dotenvService = App::make(DotenvService::class);

        $this->assertNull($dotenvService->getValue('EXAMPLE_KEY'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function save_keys()
    {
        $this->mock(DotenvEditor::class, function ($mock) {
            $mock->shouldReceive('setKey')->once()->with('EXAMPLE_KEY_1', 'value1');
            $mock->shouldReceive('setKey')->once()->with('EXAMPLE_KEY_2', 'value2');
            $mock->shouldReceive('setKey')->once()->with('EXAMPLE_KEY_3', 'value3');
            $mock->shouldReceive('save')->once();
        });

        $dotenvService = App::make(DotenvService::class);

        $dotenvService->saveKeys([
            'EXAMPLE_KEY_1' => 'value1',
            'EXAMPLE_KEY_2' => 'value2',
            'EXAMPLE_KEY_3' => 'value3',
        ]);
    }
}
