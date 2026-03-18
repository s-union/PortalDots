<?php

declare(strict_types=1);

namespace Tests\Feature\Exports;

use App\Eloquents\Answer;
use App\Eloquents\AnswerDetail;
use App\Eloquents\Circle;
use App\Eloquents\Form;
use App\Eloquents\Question;
use App\Exports\AnswersExport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

final class AnswersExportTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var AnswersExport
     */
    private $answersExport;

    /**
     * @var Circle
     */
    private $circle;

    /**
     * @var Answer
     */
    private $answer;

    /**
     * @var AnswerDetail
     */
    private $detail;

    protected function setUp(): void
    {
        parent::setUp();

        $form = Form::factory()->create();

        $this->answersExport = App::make(AnswersExport::class, ['form' => $form]);

        $this->circle = Circle::factory()->create([
            'name' => '片付けチェック見守ります',
            'name_yomi' => 'かたづけちぇっくみまもります',
            'group_name' => 'お世話好きサークル',
            'group_name_yomi' => 'おせわずきさーくる',
        ]);

        $question = Question::factory()->create([
            'form_id' => $form->id,
            'priority' => 3,
            'name' => 'せつもん',
            'type' => 'text',
        ]);

        $upload_question = Question::factory()->create([
            'form_id' => $form->id,
            'priority' => 1,
            'name' => 'あっぷろーど',
            'type' => 'upload',
        ]);

        $checkbox_question = Question::factory()->create([
            'form_id' => $form->id,
            'priority' => 4,
            'name' => 'チェックボックス',
            'type' => 'checkbox',
        ]);

        $heading_question = Question::factory()->create([
            'form_id' => $form->id,
            'priority' => 2,
            'name' => '見出しです。',
            'type' => 'heading',
        ]);

        $this->answer = Answer::factory()->create([
            'form_id' => $form->id,
            'circle_id' => $this->circle->id,
        ]);

        $this->detail = AnswerDetail::factory()->create([
            'answer_id' => $this->answer->id,
            'question_id' => $question->id,
        ]);

        $upload_detail = AnswerDetail::factory()->create([
            'answer_id' => $this->answer->id,
            'question_id' => $upload_question->id,
            'answer' => 'answer_details/TEST.png',
        ]);

        AnswerDetail::factory()->create([
            'answer_id' => $this->answer->id,
            'question_id' => $checkbox_question->id,
            'answer' => 'ひとつめ',
        ]);

        AnswerDetail::factory()->create([
            'answer_id' => $this->answer->id,
            'question_id' => $checkbox_question->id,
            'answer' => 'ふたつめ',
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function map_回答のフォーマットが正常に行われる()
    {
        $this->assertEquals(
            [
                $this->answer->id,
                $this->circle->id,
                '片付けチェック見守ります',
                'かたづけちぇっくみまもります',
                'お世話好きサークル',
                'おせわずきさーくる',
                'TEST.png',
                $this->detail->answer,
                'ひとつめ,ふたつめ',
            ],
            $this->answersExport->map($this->answer)
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function headings_設問からヘッダーが作成される()
    {
        $this->assertEquals(
            [
                '回答ID',
                '企画ID',
                '企画名',
                '企画名（よみ）',
                '企画を出店する団体の名称',
                '企画を出店する団体の名称（よみ）',
                'あっぷろーど',
                'せつもん',
                'チェックボックス',
            ],
            $this->answersExport->headings()
        );
    }
}
