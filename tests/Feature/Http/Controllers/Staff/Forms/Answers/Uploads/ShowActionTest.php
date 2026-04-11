<?php

namespace Tests\Feature\Http\Controllers\Staff\Forms\Answers\Uploads;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use App\Eloquents\Form;
use App\Eloquents\Question;
use App\Eloquents\Answer;
use App\Eloquents\AnswerDetail;
use App\Eloquents\Permission;
use App\Eloquents\User;

class ShowActionTest extends TestCase
{
    use RefreshDatabase;

    /** @var Form */
    private $form;

    /** @var Answer */
    private $answer;

    /** @var Question */
    private $question;

    /** @var Question */
    private $textQuestion;

    /** @var string */
    private $uploadPath;

    /** @var User */
    private $staff;

    public function setUp(): void
    {
        parent::setUp();

        // フォーム
        $this->form = factory(Form::class)->create();
        $this->question = factory(Question::class)->create([
            'form_id' => $this->form->id,
            'type' => 'upload',
            'number_max' => 1000000000,
            'allowed_types' => 'png|jpg|jpeg|gif',
            'options' => null,
        ]);
        $this->textQuestion = factory(Question::class)->create([
            'form_id' => $this->form->id,
            'type' => 'text',
            'allowed_types' => null,
            'options' => null,
        ]);

        // 回答
        $this->answer = factory(Answer::class)->create([
            'form_id' => $this->form->id,
        ]);

        $example_file = new File(base_path('tests/TestFile.png'));
        $filename = 'testfile_' . sha1($this->answer->id . '_' . $this->question->id) . '.png';
        $this->uploadPath = 'answer_details/' . $filename;
        factory(AnswerDetail::class)->create([
            'answer_id' => $this->answer->id,
            'question_id' => $this->question->id,
            'answer' => $this->uploadPath,
        ]);
        Storage::putFileAs('answer_details', $example_file, $filename);

        // スタッフ
        $this->staff = factory(User::class)->states('staff')->create();
    }

    /**
     * @test
     */
    public function ダウンロードできる()
    {
        $this->setReadPermission();

        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.forms.answers.uploads.show', [
                'form' => $this->form,
                'answer' => $this->answer,
                'question' => $this->question
            ]));

        $response->assertOk();
    }

    /**
     * @test
     */
    public function 権限がない場合はダウンロードできない()
    {
        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.forms.answers.uploads.show', [
                'form' => $this->form,
                'answer' => $this->answer,
                'question' => $this->question
            ]));

        $response->assertForbidden();
    }

    /**
     * @test
     */
    public function スタッフ以外はダウンロードできない()
    {
        $response = $this->actingAs(factory(User::class)->create())
            ->get(route('staff.forms.answers.uploads.show', [
                'form' => $this->form,
                'answer' => $this->answer,
                'question' => $this->question
            ]));

        $response->assertForbidden();
    }

    /**
     * @test
     */
    public function アップロード設問以外はダウンロードできない()
    {
        $this->setReadPermission();

        factory(AnswerDetail::class)->create([
            'answer_id' => $this->answer->id,
            'question_id' => $this->textQuestion->id,
            'answer' => $this->uploadPath,
        ]);

        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.forms.answers.uploads.show', [
                'form' => $this->form,
                'answer' => $this->answer,
                'question' => $this->textQuestion,
            ]));

        $response->assertStatus(404);
    }

    /**
     * @test
     */
    public function フォームと回答が紐づかない場合はダウンロードできない()
    {
        $this->setReadPermission();

        $anotherForm = factory(Form::class)->create();

        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(route('staff.forms.answers.uploads.show', [
                'form' => $anotherForm,
                'answer' => $this->answer,
                'question' => $this->question,
            ]));

        $response->assertStatus(404);
    }

    private function setReadPermission(): void
    {
        Permission::create(['name' => 'staff.forms.answers.read']);
        $this->staff->syncPermissions(['staff.forms.answers.read']);
    }
}
