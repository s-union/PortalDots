<?php

declare(strict_types=1);

namespace Tests\Feature\GridMakers;

use App\Eloquents\Page;
use App\GridMakers\PagesGridMaker;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

final class PagesGridMakerTest extends TestCase
{
    /**
     * @var PagesGridMaker
     */
    private $pagesGridMaker;

    protected function setUp(): void
    {
        parent::setUp();

        $this->pagesGridMaker = App::make(PagesGridMaker::class);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function map()
    {
        $page = Page::factory()->make([
            'created_at' => '2020-02-02 02:02:02',
            'updated_at' => '2020-02-02 02:02:02',
        ]);

        $result = $this->pagesGridMaker->map($page);

        $this->assertSame('2020/02/02 02:02:02', $result['created_at']);
        $this->assertSame('2020/02/02 02:02:02', $result['updated_at']);
    }
}
