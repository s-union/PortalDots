<?php

namespace Tests\Feature\Http\Controllers\Staff\Documents;

use App\Eloquents\Document;
use App\Eloquents\Permission;
use App\Eloquents\User;
use App\Services\Documents\DocumentsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class DestroyActionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var User
     */
    private $staff;

    /**
     * @var Document
     */
    private $document;

    protected function setUp(): void
    {
        parent::setUp();

        $this->staff = User::factory()->staff()->create();
        $this->document = Document::factory()->create();
    }

    /**
     * @test
     */
    public function documents_serviceのdelete_documentが呼び出される()
    {
        Permission::create(['name' => 'staff.documents.delete']);
        $this->staff->syncPermissions(['staff.documents.delete']);

        $this->mock(DocumentsService::class, function ($mock) {
            $mock->shouldReceive('deleteDocument')->once()->with(
                Mockery::on(function ($arg) {
                    return $arg->id === $this->document->id;
                })
            )->andReturn(true);
        });

        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->delete(route('staff.documents.destroy', ['document' => $this->document]));

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('staff.documents.index'));
    }

    /**
     * @test
     */
    public function 権限がない場合は配布資料を削除できない()
    {
        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->delete(route('staff.documents.destroy', ['document' => $this->document]));

        $response->assertForbidden();
    }
}
