<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Pages;

use App\Eloquents\Page;
use App\Eloquents\Permission;
use App\Eloquents\User;
use App\Exports\PagesExport;
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

    /**
     * @var Collection
     */
    private $pages;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2021-09-14 21:22:23'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2021-09-14 21:22:23'));

        $this->staff = User::factory()->staff()->create();

        $this->pages = Page::factory(2)->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function お知らせを_cs_vでダウンロードできる()
    {
        Permission::create(['name' => 'staff.pages.export']);
        $this->staff->syncPermissions(['staff.pages.export']);

        Excel::fake();
        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.pages.export'));

        $now = \Illuminate\Support\Facades\Date::now()->format('Y-m-d_H-i-s');

        Excel::assertDownloaded("お知らせ一覧_{$now}.csv", function (PagesExport $export) {
            $titles = $this->pages->pluck('title');

            return $export->collection()->contains('title', $titles[0])
                && $export->collection()->contains('title', $titles[1]);
        });
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合は_cs_vをダウンロードできない()
    {
        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.pages.export'))
            ->assertForbidden();
    }
}
