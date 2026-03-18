<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Documents;

use App\Eloquents\Document;
use App\Eloquents\Permission;
use App\Eloquents\User;
use App\Services\Documents\DocumentsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

final class StoreActionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var User
     */
    private $staff;

    protected function setUp(): void
    {
        parent::setUp();
        $this->staff = User::factory()->staff()->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function documents_serviceのcreate_documentが呼び出される()
    {
        Permission::create(['name' => 'staff.documents.edit']);
        $this->staff->syncPermissions(['staff.documents.edit']);

        Storage::fake('local');

        $filesize = 1;  // 単位 : KiB
        $file = UploadedFile::fake()->create('配布資料.pdf', $filesize, 'application/pdf');

        $document = Document::factory()->create([
            'path' => "documents/{$file->hashName()}.pdf",
            'size' => $filesize * 1024, // 単位 : バイト
            'extension' => 'pdf',
        ]);

        $this->mock(DocumentsService::class, function ($mock) use ($document) {
            $mock->shouldReceive('createDocument')->once()->with(
                'document name',
                'document description',
                Mockery::any(),
                false,
                true,
                'notes'
            )->andReturn($document);
        });

        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->post(route('staff.documents.store'), [
                'name' => 'document name',
                'description' => 'document description',
                'file' => $file,
                'is_public' => '0',
                'is_important' => '1',
                'notes' => 'notes',
            ]);

        $response->assertSessionHasNoErrors();

        $response->assertRedirect(route('staff.documents.create'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合は配布資料を保存できない()
    {
        $filesize = 1;  // 単位 : KiB
        $file = UploadedFile::fake()->create('配布資料.pdf', $filesize, 'application/pdf');

        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->post(route('staff.documents.store'), [
                'name' => 'document name',
                'description' => 'document description',
                'file' => $file,
                'is_public' => '0',
                'is_important' => '1',
                'notes' => 'notes',
            ]);

        $response->assertForbidden();
    }
}
