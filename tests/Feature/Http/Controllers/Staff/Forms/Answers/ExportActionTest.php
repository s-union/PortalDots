<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Forms\Answers;

use App\Eloquents\Answer;
use App\Eloquents\AnswerDetail;
use App\Eloquents\Circle;
use App\Eloquents\Form;
use App\Eloquents\Permission;
use App\Eloquents\Question;
use App\Eloquents\User;
use App\Exports\AnswersExport;
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
     * @var Circle
     */
    private $circle;

    /**
     * @var Form
     */
    private $form;

    /**
     * @var detail
     */
    private $detail;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2021-09-14 21:22:23'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2021-09-14 21:22:23'));

        $this->staff = User::factory()->staff()->create();

        $this->circle = Circle::factory()->create();

        $this->form = Form::factory()->create([
            'name' => '備品貸出',
        ]);
        $question = Question::factory()->create([
            'form_id' => $this->form->id,
        ]);
        $answer = Answer::factory()->create([
            'form_id' => $this->form->id,
            'circle_id' => $this->circle->id,
        ]);
        $this->detail = AnswerDetail::factory()->create([
            'answer_id' => $answer->id,
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 回答を_cs_vでダウンロードできる()
    {
        Permission::create(['name' => 'staff.forms.answers.export']);
        $this->staff->syncPermissions(['staff.forms.answers.export']);

        Excel::fake();
        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.forms.answers.export', ['form' => $this->form]));

        $now = \Illuminate\Support\Facades\Date::now()->format('Y-m-d_H-i-s');

        Excel::assertDownloaded("備品貸出_回答一覧_{$now}.csv", fn(AnswersExport $export) => $export->collection()->first()->circle->name === $this->circle->name
            && $export->collection()->first()->details->contains('answer', $this->detail->answer));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合は_cs_vをダウンロードできない()
    {
        $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.forms.answers.export', ['form' => $this->form]))
            ->assertForbidden();
    }
}
