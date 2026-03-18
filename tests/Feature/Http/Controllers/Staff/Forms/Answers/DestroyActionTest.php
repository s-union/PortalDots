<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Forms\Answers;

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

    private ?Collection $answers;

    private ?User $staff;

    protected function setUp(): void
    {
        parent::setUp();
        $this->form = Form::factory()->create();
        $questions = Question::factory(2)->create([
            'form_id' => $this->form->id,
            'is_required' => false,
            'type' => 'text',
        ]);
        $this->answers = Answer::factory(2)->create([
            'form_id' => $this->form->id,
        ]);
        foreach ($this->answers as $answer) {
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
    public function 回答を削除できる()
    {
        Permission::create(['name' => 'staff.forms.answers.delete']);
        $this->staff->syncPermissions(['staff.forms.answers.delete']);

        $this->assertDatabaseCount('questions', 2);
        $this->assertDatabaseCount('answers', 2);
        $this->assertDatabaseCount('answer_details', 4);

        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->delete(route('staff.forms.answers.destroy', [
                'form' => $this->form, 'answer' => $this->answers[0],
            ]));

        $response->assertRedirect(route('staff.forms.answers.index', ['form' => $this->form]));

        $this->assertDatabaseCount('questions', 2);
        $this->assertDatabaseCount('answers', 1);
        $this->assertDatabaseCount('answer_details', 2);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合はフォームを削除できない()
    {
        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->delete(route('staff.forms.answers.destroy', [
                'form' => $this->form, 'answer' => $this->answers[0],
            ]));

        $response->assertForbidden();
    }
}
