<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Users;

use App\Eloquents\Permission;
use App\Eloquents\User;
use App\Exports\UsersExport;
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
     * @var User
     */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2021-09-14 21:22:23'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2021-09-14 21:22:23'));

        $this->staff = User::factory()->staff()->create();
        $this->user = User::factory()->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function ユーザー情報を_cs_vでダウンロードできる()
    {
        Permission::create(['name' => 'staff.users.export']);
        $this->staff->syncPermissions(['staff.users.export']);

        Excel::fake();
        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.users.export'));

        $now = \Illuminate\Support\Facades\Date::now()->format('Y-m-d_H-i-s');

        Excel::assertDownloaded("ユーザー一覧_{$now}.csv", fn(UsersExport $export) => $export->collection()->contains('name', $this->staff->name)
            && $export->collection()->contains('name', $this->user->name));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合は_cs_vをダウンロードできない()
    {
        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.users.export'))
            ->assertForbidden();
    }
}
