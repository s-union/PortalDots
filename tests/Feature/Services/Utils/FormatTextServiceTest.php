<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Utils;

use App\Services\Utils\FormatTextService;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

final class FormatTextServiceTest extends TestCase
{
    /**
     * @var FormatTextService
     */
    private $formatTextService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->formatTextService = App::make(FormatTextService::class);
    }

    public static function filesizeProvider(): \Iterator
    {
        yield [1000, '0.98KB'];
        yield [1030, '1.01KB'];
        yield [1000000000000000, '931322.57GB'];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('filesizeProvider')]
    #[\PHPUnit\Framework\Attributes\Test]
    public function filesize($arg, $result)
    {
        $this->assertSame($result, $this->formatTextService->filesize($arg));
    }

    public static function escapeMarkdownProvider(): \Iterator
    {
        yield ['Hello, *World*!', 'Hello, \\*World\\*\!'];
        yield ['こんにちは、**世界**！', 'こんにちは、\\*\\*世界\\*\\*！'];
        yield ['\\* テキスト \\*', '\\\\\\* テキスト \\\\\\*'];
        yield ['This is `code`.', 'This is \\`code\\`\\.'];
        yield ['## Title', '\\#\\# Title'];
        yield ['+ Plus', '\\+ Plus'];
        yield ['- Minus', '\\- Minus'];
        yield ['Hello, World.', 'Hello, World\\.'];
        yield [
            '![Example Image](https://example.com/image.png)',
            '\\!\\[Example Image\\]\\(https://example\\.com/image\\.png\\)',
        ];
        yield ['Hello, {{World}}', 'Hello, \\{\\{World\\}\\}'];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('escapeMarkdownProvider')]
    #[\PHPUnit\Framework\Attributes\Test]
    public function escape_markdown($arg, $result)
    {
        $this->assertSame($result, $this->formatTextService->escapeMarkdown($arg));
    }
}
