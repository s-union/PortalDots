<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Places;

use App\Eloquents\Permission;
use App\Eloquents\Place;
use App\Eloquents\User;
use App\Exports\PlacesExport;
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

        $place = Place::factory()->create([
            'name' => 'E208',
        ]);

        $anotherPlace = Place::factory()->create([
            'name' => 'E209',
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function ブース情報が_cs_vでダウンロードできる()
    {
        Permission::create(['name' => 'staff.places.export']);
        $this->staff->syncPermissions(['staff.places.export']);

        Excel::fake();

        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.places.export'));

        $now = \Illuminate\Support\Facades\Date::now()->format('Y-m-d_H-i-s');

        Excel::assertDownloaded("場所一覧_{$now}.csv", fn(PlacesExport $export) => $export->collection()->contains('name', 'E208')
            && $export->collection()->contains('name', 'E209'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合は_cs_vをダウンロードできない()
    {
        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.places.export'))
            ->assertForbidden();
    }
}
