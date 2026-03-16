<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Forms;

use App\Eloquents\Form;
use App\Eloquents\ParticipationType;
use App\Eloquents\Permission;
use App\Eloquents\User;
use App\Exports\FormsExport;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Maatwebsite\Excel\Facades\Excel;
use Tests\TestCase;

final class ExportActionTest extends TestCase
{
    use RefreshDatabase;

    private ?User $staff;

    private ?Form $participationForm;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2021-09-14 21:22:23'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2021-09-14 21:22:23'));

        $this->staff = User::factory()->staff()->create();

        $form = Form::factory()->create([
            'name' => '場所登録申請',
        ]);

        $anotherForm = Form::factory()->create([
            'name' => 'パンフレット掲載内容',
        ]);

        $this->participationForm = Form::factory()->create();

        ParticipationType::factory()->create([
            'form_id' => $this->participationForm->id,
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function フォーム情報が_cs_vでダウンロードできる()
    {
        Permission::create(['name' => 'staff.forms.export']);
        $this->staff->syncPermissions(['staff.forms.export']);

        Excel::fake();

        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.forms.export'));

        $now = \Illuminate\Support\Facades\Date::now()->format('Y-m-d_H-i-s');

        Excel::assertDownloaded("申請一覧_{$now}.csv", fn(FormsExport $export) => $export->collection()->contains('name', '場所登録申請')
            && $export->collection()->contains('name', 'パンフレット掲載内容')
            && ! $export->collection()->contains('name', $this->participationForm->name));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合は_cs_vをダウンロードできない()
    {
        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.forms.export'))
            ->assertForbidden();
    }
}
