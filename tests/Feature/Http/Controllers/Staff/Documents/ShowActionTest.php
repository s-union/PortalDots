<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Documents;

use App\Eloquents\Document;
use App\Eloquents\Permission;
use App\Eloquents\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class ShowActionTest extends TestCase
{
    use RefreshDatabase;

    /** @var Document */
    private $document;

    /** @var User */
    private $staff;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        // 配布資料
        $file = UploadedFile::fake()->create('ファイル.pdf', 1);
        $this->document = Document::factory()->create([
            'path' => $file->store('documents'),
            'size' => $file->getSize(),
            'extension' => $file->getClientOriginalExtension(),
        ]);

        // スタッフ
        $this->staff = User::factory()->staff()->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function ダウンロードできる()
    {
        Permission::create(['name' => 'staff.documents.read']);
        $this->staff->syncPermissions(['staff.documents.read']);

        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.documents.show', [
                'document' => $this->document,
            ]));

        $response->assertOk();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合はダウンロードできない()
    {
        $response = $this->actingAs(User::factory()->create())
            ->get(route('staff.documents.show', [
                'document' => $this->document,
            ]));

        $response->assertForbidden();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function スタッフ以外はダウンロードできない()
    {
        $response = $this->actingAs(User::factory()->create())
            ->get(route('staff.documents.show', [
                'document' => $this->document,
            ]));

        $response->assertForbidden();
    }
}
