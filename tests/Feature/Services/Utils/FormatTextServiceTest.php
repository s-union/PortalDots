<?php

namespace Tests\Feature\Services\Utils;

use App\Services\Utils\FormatTextService;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class FormatTextServiceTest extends TestCase
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

    public static function filesizeProvider()
    {
        return [
            [1000, '0.98KB'],
            [1030, '1.01KB'],
            [1000000000000000, '931322.57GB'],
        ];
    }

    /**
     * @test
     *
     * @dataProvider filesizeProvider
     */
    public function filesize($arg, $result)
    {
        $this->assertSame($result, $this->formatTextService->filesize($arg));
    }

    public static function escapeMarkdownProvider()
    {
        return [
            ['Hello, *World*!', 'Hello, \\*World\\*\!'],
            ['こんにちは、**世界**！', 'こんにちは、\\*\\*世界\\*\\*！'],
            ['\\* テキスト \\*', '\\\\\\* テキスト \\\\\\*'],
            ['This is `code`.', 'This is \\`code\\`\\.'],
            ['## Title', '\\#\\# Title'],
            ['+ Plus', '\\+ Plus'],
            ['- Minus', '\\- Minus'],
            ['Hello, World.', 'Hello, World\\.'],
            [
                '![Example Image](https://example.com/image.png)',
                '\\!\\[Example Image\\]\\(https://example\\.com/image\\.png\\)',
            ],
            ['Hello, {{World}}', 'Hello, \\{\\{World\\}\\}'],
        ];
    }

    /**
     * @test
     *
     * @dataProvider escapeMarkdownProvider
     */
    public function escape_markdown($arg, $result)
    {
        $this->assertSame($result, $this->formatTextService->escapeMarkdown($arg));
    }
}
