<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Tags;

use App\Eloquents\Permission;
use App\Eloquents\Tag;
use App\Eloquents\User;
use App\Exports\TagsExport;
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
    private $tags;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2021-09-14 21:22:23'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2021-09-14 21:22:23'));

        $this->staff = User::factory()->staff()->create();
        $this->tags = Tag::factory(2)->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 企画タグの_cs_vがダウンロードできる()
    {
        Permission::create(['name' => 'staff.tags.export']);
        $this->staff->syncPermissions(['staff.tags.export']);

        Excel::fake();
        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.tags.export'));

        $now = \Illuminate\Support\Facades\Date::now()->format('Y-m-d_H-i-s');

        Excel::assertDownloaded("企画タグ一覧_{$now}.csv", function (TagsExport $export) {
            $names = $this->tags->pluck('name');

            return $export->collection()->contains('name', $names[0])
                && $export->collection()->contains('name', $names[1]);
        });
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合は_cs_vをダウンロードできない()
    {
        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.tags.export'))
            ->assertForbidden();
    }
}
