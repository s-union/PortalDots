<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Circles;

use App\Eloquents\Circle;
use App\Eloquents\Permission;
use App\Eloquents\User;
use App\Exports\CirclesExport;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Maatwebsite\Excel\Facades\Excel;
use Tests\TestCase;

final class ExportActionTest extends TestCase
{
    use RefreshDatabase;

    /** @var User */
    private $staff;

    /** @var Circle */
    private $circle;

    /** @var Circle */
    private $circle_not_submitted;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2019-08-21 14:52:38'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2019-08-21 14:52:38'));

        $this->staff = User::factory()->staff()->create();

        $user = User::factory()->create();
        $this->circle = Circle::factory()->create();
        $this->circle_not_submitted = Circle::factory()->notSubmitted()->create();

        $user->circles()->attach($this->circle->id, ['is_leader' => true]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 企画情報を_cs_vでダウンロードできる()
    {
        Permission::create(['name' => 'staff.circles.export']);
        $this->staff->syncPermissions(['staff.circles.export']);

        Excel::fake();
        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get('/staff/circles/export');

        $now = \Illuminate\Support\Facades\Date::now()->format('Y-m-d_H-i-s');

        Excel::assertDownloaded("企画一覧_{$now}.csv", fn(CirclesExport $export) => $export->collection()->contains('name', $this->circle->name)
            && $export->collection()->contains('name', '<>', $this->circle_not_submitted->name));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合は_cs_vをダウンロードできない()
    {
        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get('/staff/circles/export')
            ->assertForbidden();
    }
}
