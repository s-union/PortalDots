<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Documents;

use App\Eloquents\User;
use App\Services\Documents\DocumentsService;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class DocumentsServiceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var DocumentsService
     */
    private $documentsService;

    /**
     * @var FilesystemAdapter
     */
    private $localDisk;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->localDisk = Storage::disk('local');
        $this->documentsService = App::make(DocumentsService::class);
        $staff = User::factory()->staff()->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function create_document()
    {
        $filesize = 1;  // 単位 : KiB
        $file = UploadedFile::fake()->create('第２回.pdf', $filesize, 'application/pdf');

        $this->documentsService->createDocument(
            '第２回会議資料',
            '第２回会議にて配布した資料のPDFバージョンです',
            $file,
            true,
            false,
            'メモです'
        );

        $this->localDisk->assertExists("documents/{$file->hashName()}");

        $this->assertDatabaseHas('documents', [
            'name' => '第２回会議資料',
            'description' => '第２回会議にて配布した資料のPDFバージョンです',
            'path' => "documents/{$file->hashName()}",
            'size' => $filesize * 1024, // 単位 : バイト
            'extension' => 'pdf',
            'is_public' => true,
            'is_important' => false,
            'notes' => 'メモです',
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_document_ファイルはアップデートせずに更新できる()
    {
        $document = $this->documentsService->createDocument(
            '第２回会議資料',
            '第２回会議にて配布した資料のPDFバージョンです',
            UploadedFile::fake()->create('第２回.pdf', 1, 'application/pdf'),
            true,
            false,
            'メモです'
        );

        $this->documentsService->updateDocument(
            $document,
            'updated filename',
            'updated description',
            null,
            false,
            true,
            'updated notes'
        );

        $this->assertDatabaseHas('documents', [
            'name' => 'updated filename',
            'description' => 'updated description',
            'is_public' => false,
            'is_important' => true,
            'notes' => 'updated notes',
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function update_document_ファイルのアップデートができる()
    {
        $oldFile = UploadedFile::fake()->create('第２回.pdf', 1, 'application/pdf');

        $document = $this->documentsService->createDocument(
            '第２回会議資料',
            '第２回会議にて配布した資料のPDFバージョンです',
            $oldFile,
            true,
            false,
            'メモです'
        );

        $this->documentsService->updateDocument(
            $document,
            'updated filename',
            'updated description',
            UploadedFile::fake()->create('update.jpeg', 1, 'image/jpeg'),
            false,
            true,
            'updated notes'
        );

        $this->localDisk->assertMissing("document/{$oldFile->hashName()}");

        $this->assertDatabaseHas('documents', [
            'name' => 'updated filename',
            'description' => 'updated description',
            'extension' => 'jpeg',
            'is_public' => false,
            'is_important' => true,
            'notes' => 'updated notes',
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function delete_document_ファイルの削除ができる()
    {
        $file = UploadedFile::fake()->create('削除されちゃう.pdf', 1, 'application/pdf');

        $document = $this->documentsService->createDocument(
            '削除される資料',
            '削除される資料です。悲しいね。',
            $file,
            true,
            false,
            'ドロン'
        );

        $this->localDisk->assertExists("documents/{$file->hashName()}");

        $this->documentsService->deleteDocument($document);

        $this->localDisk->assertMissing("documents/{$file->hashName()}");
        $this->assertDatabaseMissing('documents', [
            'id' => $document->id,
            'name' => '削除される資料です',
        ]);
    }
}
