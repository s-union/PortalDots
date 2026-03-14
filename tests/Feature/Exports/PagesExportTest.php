<?php

namespace Tests\Feature\Exports;

use App\Eloquents\Page;
use App\Eloquents\Tag;
use App\Eloquents\User;
use App\Exports\PagesExport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class PagesExportTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var PagesExport
     */
    private $pagesExport;

    /**
     * @var User
     */
    private $staff;

    /**
     * @var Tag
     */
    private $tag;

    /**
     * @var Page
     */
    private $page;

    public function setUp(): void
    {
        parent::setUp();

        $this->pagesExport = App::make(PagesExport::class);
        $this->staff = User::factory()->staff()->create([
            'name' => '野田 一郎',
        ]);
        $this->tag = Tag::factory()->create([
            'name' => 'タグです',
        ]);
        $this->page = Page::factory()->create([
            'is_pinned' => false,
            'is_public' => true,
        ]);
        $this->page->viewableTags()->attach($this->tag->id);
    }

    /**
     * @test
     */
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
