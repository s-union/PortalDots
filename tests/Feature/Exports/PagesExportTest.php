<?php

declare(strict_types=1);

namespace Tests\Feature\Exports;

use App\Eloquents\Page;
use App\Eloquents\Tag;
use App\Eloquents\User;
use App\Exports\PagesExport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

final class PagesExportTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var PagesExport
     */
    private $pagesExport;

    /**
     * @var Page
     */
    private $page;

    protected function setUp(): void
    {
        parent::setUp();

        $this->pagesExport = App::make(PagesExport::class);
        $staff = User::factory()->staff()->create([
            'name' => '野田 一郎',
        ]);
        $tag = Tag::factory()->create([
            'name' => 'タグです',
        ]);
        $this->page = Page::factory()->create([
            'is_pinned' => false,
            'is_public' => true,
        ]);
        $this->page->viewableTags()->attach($tag->id);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function map_お知らせのフォーマットが正常に行われる()
    {
        $this->assertEquals(
            [
                $this->page->id,
                $this->page->title,
                'タグです',
                $this->page->body,
                'いいえ',
                'はい',
                $this->page->notes,
                $this->page->created_at,
                $this->page->updated_at,
            ],
            $this->pagesExport->map($this->page)
        );
    }
}
