<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Forms;

use App\Eloquents\Answer;
use App\Eloquents\AnswerDetail;
use App\Eloquents\Form;
use App\Eloquents\Permission;
use App\Eloquents\Question;
use App\Eloquents\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class DestroyActionTest extends TestCase
{
    use RefreshDatabase;

    private ?Form $form;

    private ?User $staff;

    protected function setUp(): void
    {
        parent::setUp();
        $this->form = Form::factory()->create([
            'name' => '削除対象のフォーム',
        ]);
        $questions = Question::factory(2)->create([
            'form_id' => $this->form->id,
            'is_required' => false,
            'type' => 'text',
        ]);
        $answers = Answer::factory(2)->create([
            'form_id' => $this->form->id,
        ]);
        foreach ($answers as $answer) {
            $answerDetails[] = AnswerDetail::factory()->create([
                'answer_id' => $answer->id,
                'question_id' => $questions[0]->id,
                'answer' => '回答 １',
            ]);
            $answerDetails[] = AnswerDetail::factory()->create([
                'answer_id' => $answer->id,
                'question_id' => $questions[1]->id,
                'answer' => '回答 ２',
            ]);
        }
        $this->staff = User::factory()->staff()->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function フォームを削除できる()
    {
        Permission::create(['name' => 'staff.forms.delete']);
        $this->staff->syncPermissions(['staff.forms.delete']);

        $this->assertDatabaseHas('forms', [
            'name' => '削除対象のフォーム',
        ]);
        $this->assertDatabaseCount('questions', 2);
        $this->assertDatabaseCount('answers', 2);
        $this->assertDatabaseCount('answer_details', 4);

        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->delete(route('staff.forms.destroy', ['form' => $this->form]));

        $response->assertRedirect(route('staff.forms.index'));

        $this->assertDatabaseMissing('forms', [
            'name' => '削除対象のフォーム',
        ]);
        $this->assertDatabaseCount('questions', 0);
        $this->assertDatabaseCount('answers', 0);
        $this->assertDatabaseCount('answer_details', 0);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合はフォームを削除できない()
    {
        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->delete(route('staff.forms.destroy', ['form' => $this->form]));

        $response->assertForbidden();
    }
}
