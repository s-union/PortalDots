<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Documents;

use App\Eloquents\Document;
use App\Eloquents\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class ShowActionTest extends TestCase
{
    use RefreshDatabase;

    private $document;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
        Storage::fake('local');

        // 配布資料
        $file = UploadedFile::fake()->create('ファイル.pdf', 1);
        $this->document = Document::factory()->create([
            'path' => $file->store('documents'),
            'size' => $file->getSize(),
            'extension' => $file->getClientOriginalExtension(),
        ]);

        // ユーザー
        $this->user = User::factory()->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function ダウンロードできる()
    {
        $response = $this->actingAs($this->user)
            ->get(route('documents.show', [
                'document' => $this->document,
            ]));

        $response->assertOk();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 非公開の場合はダウンロードできない()
    {
        $this->document->is_public = false;
        $this->document->save();

        $response = $this->actingAs($this->user)
            ->get(route('documents.show', [
                'document' => $this->document,
            ]));

        $response->assertStatus(404);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 非公開資料はキャッシュされない()
    {
        $this->document->is_public = false;
        $this->document->save();

        $cache_key = Document::publicCacheKey($this->document->id);

        $this->actingAs($this->user)
            ->get(route('documents.show', [
                'document' => $this->document,
            ]))
            ->assertStatus(404);

        $this->assertFalse(Cache::has($cache_key));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 存在しない資料idはキャッシュされない()
    {
        $document_id = $this->document->id + 100000;
        $cache_key = Document::publicCacheKey($document_id);

        $this->actingAs($this->user)
            ->get(route('documents.show', [
                'document' => $document_id,
            ]))
            ->assertStatus(404);

        $this->assertFalse(Cache::has($cache_key));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 二回目アクセスではdocumentsテーブルを参照しない()
    {
        $connection = DB::connection();
        $connection->enableQueryLog();
        $connection->flushQueryLog();

        $this->actingAs($this->user)
            ->get(route('documents.show', [
                'document' => $this->document,
            ]))
            ->assertOk();

        $first_query_log = $connection->getQueryLog();
        $connection->flushQueryLog();

        $this->actingAs($this->user)
            ->get(route('documents.show', [
                'document' => $this->document,
            ]))
            ->assertOk();

        $second_query_log = $connection->getQueryLog();

        $this->assertGreaterThan(0, $this->countDocumentsQueries($first_query_log));
        $this->assertSame(0, $this->countDocumentsQueries($second_query_log));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 上限を超えるidは404を返しdocumentsを参照しない()
    {
        $connection = DB::connection();
        $connection->enableQueryLog();
        $connection->flushQueryLog();

        $this->actingAs($this->user)
            ->get(route('documents.show', [
                'document' => '999999999999999999999999',
            ]))
            ->assertStatus(404);

        $this->assertSame(0, $this->countDocumentsQueries($connection->getQueryLog()));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 配布資料の実ファイルが存在しない場合は404を返す()
    {
        Storage::delete($this->document->path);

        $response = $this->actingAs($this->user)
            ->get(route('documents.show', [
                'document' => $this->document,
            ]));

        $response->assertStatus(404);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 公開設定の更新時にキャッシュが失効する()
    {
        $cache_key = Document::publicCacheKey($this->document->id);

        $this->actingAs($this->user)
            ->get(route('documents.show', [
                'document' => $this->document,
            ]))
            ->assertOk();

        $this->assertTrue(Cache::has($cache_key));

        $this->document->is_public = false;
        $this->document->save();

        $this->assertFalse(Cache::has($cache_key));

        $this->actingAs($this->user)
            ->get(route('documents.show', [
                'document' => $this->document,
            ]))
            ->assertStatus(404);
    }

    private function countDocumentsQueries(array $query_log): int
    {
        return collect($query_log)
            ->filter(function (array $query) {
                $sql = strtolower((string) ($query['query'] ?? ''));

                return str_contains($sql, 'from "documents"')
                    || str_contains($sql, 'from `documents`')
                    || str_contains($sql, 'from documents');
            })
            ->count();
    }
}
