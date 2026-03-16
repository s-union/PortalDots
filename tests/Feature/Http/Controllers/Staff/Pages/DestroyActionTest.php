<?php

namespace Tests\Feature\Http\Controllers\Staff\Pages;

use App\Eloquents\Page;
use App\Eloquents\Permission;
use App\Eloquents\Read;
use App\Eloquents\Tag;
use App\Eloquents\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DestroyActionTest extends TestCase
{
    use RefreshDatabase;

    /** @var User */
    private $staff;

    /** @var Tag */
    private $tag;

    /** @var Page */
    private $page;

    /** @var Read */
    private $read;

    protected function setUp(): void
    {
        parent::setUp();

        $this->staff = User::factory()->staff()->create();
        $this->tag = Tag::factory()->create();
        $this->page = Page::factory()->create();
        $this->read = Read::factory(5)->create(['page_id' => $this->page->id]);
    }

    /**
     * @test
     */
    public function お知らせを削除できる()
    {
        Permission::create(['name' => 'staff.pages.delete']);
        $this->staff->syncPermissions(['staff.pages.delete']);

        $this->page->viewableTags()->attach($this->tag->id);

        $this->assertDatabaseHas('pages', [
            'id' => $this->page->id,
        ]);

        $this->assertDatabaseHas('tags', [
            'id' => $this->tag->id,
        ]);

        $this->assertDatabaseHas('page_viewable_tags', [
            'page_id' => $this->page->id,
            'tag_id' => $this->tag->id,
        ]);

        $this->assertDatabaseHas('reads', [
            'page_id' => $this->page->id,
        ]);

        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->delete(
                route('staff.pages.destroy', [
                    'page' => $this->page->id,
                ])
            );

        $this->assertDatabaseMissing('pages', [
            'id' => $this->page->id,
        ]);

        $this->assertDatabaseMissing('page_viewable_tags', [
            'page_id' => $this->page->id,
            'tag_id' => $this->tag->id,
        ]);

        $this->assertDatabaseMissing('reads', [
            'page_id' => $this->page->id,
        ]);
    }

    /**
     * @test
     */
    public function 権限がない場合はお知らせを削除できない()
    {
        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->delete(
                route('staff.pages.destroy', [
                    'page' => $this->page->id,
                ])
            )
            ->assertForbidden();
    }
}
