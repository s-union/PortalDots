<?php

namespace Tests\Feature\Services\Forms;

use App\Eloquents\Answer;
use App\Eloquents\Circle;
use App\Eloquents\Form;
use App\Eloquents\Question;
use App\Eloquents\User;
use App\Services\Forms\AnswerDetailsService;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AnswerDetailsServiceTest extends TestCase
{
    use RefreshDatabase;

    /** @var AnswerDetailsService */
    private $answerDetailsService;

    /** @var User */
    private $user;

    /** @var Circle */
    private $circle;

    /** @var FilesystemAdapter */
    private $localDisk;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->localDisk = Storage::disk('local');

        $this->answerDetailsService = App::make(AnswerDetailsService::class);

        $this->user = User::factory()->create();
        $this->circle = Circle::factory()->create();

        $this->circle->users()->save($this->user);
    }

    /**
     * @test
     */
    public function update_answer_details_ファイルの更新した時に古いファイルが削除される()
    {
        $form = Form::factory()->create();

        $file_upload = Question::factory()->create([
            'form_id' => $form->id,
            'type' => 'upload',
        ]);

        $answer = Answer::factory()->create([
            'form_id' => $form->id,
            'circle_id' => $this->circle->id,
        ]);

        Auth::login($this->user);

        $old_file = UploadedFile::fake()->create('file.jpeg', 0, 'image/jpeg')->store('answer_details');

        $this->answerDetailsService->updateAnswerDetails($form, $answer, [$file_upload->id => $old_file]);

        // ファイルの存在を確認
        $this->localDisk->assertExists($old_file);

        $new_file = UploadedFile::fake()->create('update.png', 0, 'image/png')->store('answer_details');

        $this->answerDetailsService->updateAnswerDetails($form, $answer, [$file_upload->id => $new_file]);

        $this->localDisk->assertExists($new_file);
        $this->localDisk->assertMissing($old_file);
    }

    /**
     * @test
     */
    public function update_answer_details_ファイルの削除した時に古いファイルが削除される()
    {
        $form = Form::factory()->create();

        $file_upload = Question::factory()->create([
            'form_id' => $form->id,
            'type' => 'upload',
        ]);

        $answer = Answer::factory()->create([
            'form_id' => $form->id,
            'circle_id' => $this->circle->id,
        ]);

        Auth::login($this->user);

        $file = UploadedFile::fake()->create('file.jpeg', 0, 'image/jpeg')->store('answer_details');

        $this->answerDetailsService->updateAnswerDetails($form, $answer, [$file_upload->id => $file]);

        // ファイルの存在を確認
        $this->localDisk->assertExists($file);

        $this->answerDetailsService->updateAnswerDetails($form, $answer, []);

        $this->localDisk->assertMissing($file);
    }

    /**
     * @test
     */
    public function update_answer_details_ファイルの更新をしていない時はアップロードされたファイルを削除しない()
    {
        $form = Form::factory()->create();

        $file_upload = Question::factory()->create([
            'form_id' => $form->id,
            'type' => 'upload',
        ]);

        $answer = Answer::factory()->create([
            'form_id' => $form->id,
            'circle_id' => $this->circle->id,
        ]);

        Auth::login($this->user);

        $file = UploadedFile::fake()->create('file.jpeg', 0, 'image/jpeg')->store('answer_details');

        $this->answerDetailsService->updateAnswerDetails($form, $answer, [$file_upload->id => $file]);

        // ファイルの存在を確認
        $this->localDisk->assertExists($file);

        $this->answerDetailsService->updateAnswerDetails($form, $answer, [$file_upload->id => '__KEEP__']);

        $this->localDisk->assertExists($file);
    }
}
