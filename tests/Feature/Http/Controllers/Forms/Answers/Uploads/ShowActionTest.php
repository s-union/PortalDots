<?php

namespace Tests\Feature\Http\Controllers\Forms\Answers\Uploads;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use App\Eloquents\Answer;
use App\Eloquents\AnswerDetail;
use App\Eloquents\Circle;
use App\Eloquents\Form;
use App\Eloquents\Question;
use App\Eloquents\User;

class ShowActionTest extends TestCase
{
    use RefreshDatabase;

    /** @var User */
    private $user;

    /** @var Form */
    private $form;

    /** @var Answer */
    private $answer;

    /** @var Question */
    private $uploadQuestion;

    /** @var Question */
    private $textQuestion;

    /** @var string */
    private $uploadPath;

    public function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->form = factory(Form::class)->create();
        $this->uploadQuestion = factory(Question::class)->create([
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

        $this->user = factory(User::class)->create();
        $circle = factory(Circle::class)->create();
        $this->user->circles()->attach($circle->id, ['is_leader' => true]);

        $this->answer = factory(Answer::class)->create([
            'form_id' => $this->form->id,
            'circle_id' => $circle->id,
        ]);

        $example_file = new File(base_path('tests/TestFile.png'));
        $filename = 'testfile_' . sha1($this->answer->id . '_' . $this->uploadQuestion->id) . '.png';
        $this->uploadPath = 'answer_details/' . $filename;

        Storage::putFileAs('answer_details', $example_file, $filename);
        factory(AnswerDetail::class)->create([
            'answer_id' => $this->answer->id,
            'question_id' => $this->uploadQuestion->id,
            'answer' => $this->uploadPath,
        ]);
    }

    /**
     * @test
     */
    public function アップロード設問のファイルはダウンロードできる()
    {
        $response = $this->actingAs($this->user)
            ->get(route('forms.answers.uploads.show', [
                'form' => $this->form,
                'answer' => $this->answer,
                'question' => $this->uploadQuestion,
            ]));

        $response->assertOk();
    }

    /**
     * @test
     */
    public function アップロード設問以外はダウンロードできない()
    {
        factory(AnswerDetail::class)->create([
            'answer_id' => $this->answer->id,
            'question_id' => $this->textQuestion->id,
            'answer' => $this->uploadPath,
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('forms.answers.uploads.show', [
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
        $anotherForm = factory(Form::class)->create();

        $response = $this->actingAs($this->user)
            ->get(route('forms.answers.uploads.show', [
                'form' => $anotherForm,
                'answer' => $this->answer,
                'question' => $this->uploadQuestion,
            ]));

        $response->assertStatus(404);
    }

    /**
     * @test
     */
    public function 自分が所属していない企画によるアップロードファイルはダウンロードできない()
    {
        $response = $this->actingAs(factory(User::class)->create())
            ->get(route('forms.answers.uploads.show', [
                'form' => $this->form,
                'answer' => $this->answer,
                'question' => $this->uploadQuestion,
            ]));

        $response->assertStatus(404);
    }
}
