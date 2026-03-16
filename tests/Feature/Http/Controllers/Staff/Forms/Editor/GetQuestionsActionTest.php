<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Forms\Editor;

use App\Eloquents\Form;
use App\Eloquents\ParticipationType;
use App\Eloquents\Permission;
use App\Eloquents\Question;
use App\Eloquents\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class GetQuestionsActionTest extends TestCase
{
    use RefreshDatabase;

    private ?Form $form;

    private ?array $questions;

    private ?User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->form = Form::factory()->create();
        $this->questions = [
            Question::factory()->create(['priority' => 2, 'form_id' => $this->form->id]),
            Question::factory()->create(['priority' => 1, 'form_id' => $this->form->id]),
            Question::factory()->create(['priority' => 4, 'form_id' => $this->form->id]),
            Question::factory()->create(['priority' => 3, 'form_id' => $this->form->id]),
        ];
        $this->staff = User::factory()->staff()->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function priority順の設問一覧が出力される()
    {
        Permission::create(['name' => 'staff.forms.edit']);
        $this->staff->syncPermissions(['staff.forms.edit']);

        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.forms.editor.api', ['form' => $this->form]).'/get_questions');

        $response->assertStatus(200);
        $this->assertSame(1, $response[0]['priority']);
        $this->assertSame(2, $response[1]['priority']);
        $this->assertSame(3, $response[2]['priority']);
        $this->assertSame(4, $response[3]['priority']);

        $this->assertSame($this->questions[1]->name, $response[0]['name']);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 参加登録フォームの場合は参加登録フォーム固有の設問も出力される()
    {
        Permission::create(['name' => 'staff.forms.edit']);
        $this->staff->syncPermissions(['staff.forms.edit']);

        ParticipationType::factory()->create([
            'form_id' => $this->form->id,
        ]);

        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.forms.editor.api', ['form' => $this->form]).'/get_questions');

        $response->assertStatus(200);
        $this->assertTrue($response[0]['is_permanent']);
    }
}
