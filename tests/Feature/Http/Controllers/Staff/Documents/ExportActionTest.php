<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Documents;

use App\Eloquents\Document;
use App\Eloquents\Permission;
use App\Eloquents\User;
use App\Exports\DocumentsExport;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Maatwebsite\Excel\Facades\Excel;
use Tests\TestCase;

final class ExportActionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var User
     */
    private $staff;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2021-09-14 21:22:23'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2021-09-14 21:22:23'));

        $this->staff = User::factory()->staff()->create();

        $document = Document::factory()->create([
            'name' => '配布資料',
        ]);

        $anotherDocument = Document::factory()->create([
            'name' => '見てほしい資料',
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 配布資料の情報が_cs_vでダウンロードできる()
    {
        Permission::create(['name' => 'staff.documents.export']);
        $this->staff->syncPermissions(['staff.documents.export']);

        Excel::fake();

        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.documents.export'));

        $now = \Illuminate\Support\Facades\Date::now()->format('Y-m-d_H-i-s');

        Excel::assertDownloaded("配布資料一覧_{$now}.csv", fn(DocumentsExport $export) => $export->collection()->contains('name', '配布資料')
            && $export->collection()->contains('name', '見てほしい資料'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合は_cs_vをダウンロードできない()
    {
        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.documents.export'))
            ->assertForbidden();
    }
}
