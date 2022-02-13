<?php

namespace Tests\Feature\Services\Forms;

use App\Eloquents\Form;
use App\Eloquents\Option;
use App\Eloquents\Question;
use App\Services\Forms\QuestionsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class QuestionsServiceTest extends TestCase
{
    use RefreshDatabase;
    use WithFaker;

    /* @var $questions_service QuestionsService */
    private $questions_service;

    /* @var $form Form */
    private $form;

    public function setUp(): void
    {
        parent::setUp();
        $this->questions_service = App::make(QuestionsService::class);
        $this->form = factory(Form::class)->create([
            'name' => 'テスト申請',
            'is_public' => true
        ]);
    }

    private function createQuestionAndOptions(): array
    {
        $question = factory(Question::class)->create([
            'type' => $this->faker->randomElement(Question::SHOULD_SAVE_OPTIONS_QUESTION_TYPES),
            'options' => "テスト1\nテスト2\nテスト3",
            'form_id' => $this->form->id
        ]);
        $options = [
            'option_1' => factory(Option::class)->create([
                'question_id' => $question->id,
                'name' => "テスト1"
            ]),
            'option_2' => factory(Option::class)->create([
                'question_id' => $question->id,
                'name' => "テスト2"
            ]),
            'option_3' => factory(Option::class)->create([
                'question_id' => $question->id,
                'name' => "テスト3"
            ])
        ];

        return [
            'question' => $question,
            'options' => $options
        ];
    }

    /** @test */
    public function updateQuestion_重複のない質問の選択肢を正常に更新できる()
    {
        $array = $this->createQuestionAndOptions();
        $question = $array['question'];
        $options = $array['options'];
        $this->questions_service->updateQuestion(
            $question->id,
            [
                // `is_required`を含めないと`false`に置き換わってしまうので注意
                'is_required' => $question->is_required,
                'options' => "テスト置き換え1\nテスト置き換え2\nテスト置き換え3"
            ]
        );

        $question_fields = $question->only(['id']);
        $question_fields['options'] = "テスト置き換え1\nテスト置き換え2\nテスト置き換え3";
        $this->assertDatabaseHas('questions', $question_fields);

        /* Options テーブルの更新も確認する */
        $this->assertDeleted($options['option_1']);
        $this->assertDeleted($options['option_2']);
        $this->assertDeleted($options['option_3']);
        $this->assertDatabaseHas('options', [
            'question_id' => $question->id,
            'name' => 'テスト置き換え1'
        ]);
        $this->assertDatabaseHas('options', [
            'question_id' => $question->id,
            'name' => 'テスト置き換え2'
        ]);
        $this->assertDatabaseHas('options', [
            'question_id' => $question->id,
            'name' => 'テスト置き換え3'
        ]);
    }

    /** @test */
    public function updateQuestion_optionがemptyで渡されたときに選択肢は作成されない()
    {
        // emptyは`null`または空文字のどちらでも`true`を返すことに注意する
        $array = $this->createQuestionAndOptions();
        $question = $array['question'];
        $this->questions_service->updateQuestion(
            $question->id,
            [
                'is_required' => $question->is_required,
                'options' => ''
            ]
        );

        $question_fields = $question->only(['id']);
        $question_fields['options'] = null;
        // `Question->options`は`NULL`になっているはず
        $this->assertDatabaseHas('questions', $question_fields);
        // `Option`は作られていないはず
        $this->assertEquals(0, Option::all()->count());
    }

    /** @test */
    public function updateQuestion_重複のある質問の選択肢を正常に更新できる()
    {
        $array = $this->createQuestionAndOptions();
        $question = $array['question'];
        $this->questions_service->updateQuestion(
            $question->id,
            [
                // `is_required`を含めないと`false`に置き換わってしまうので注意
                'is_required' => $question->is_required,
                'options' => "テスト置き換え1\nテスト置き換え1\nテスト置き換え2"
            ]
        );

        $question_fields = $question->only(['id']);
        $question_fields['options'] = "テスト置き換え1\nテスト置き換え2";
        $this->assertDatabaseHas('questions', $question_fields);

        /* `Options`テーブルの更新も確認する */
        $this->assertEquals(1, Option::where('name', 'テスト置き換え1')->count());
        $this->assertDatabaseHas('options', [
            'question_id' => $question->id,
            'name' => 'テスト置き換え1'
        ]);
        $this->assertDatabaseHas('options', [
            'question_id' => $question->id,
            'name' => 'テスト置き換え2'
        ]);
    }

    /** @test */
    public function updateQuestion_選択肢を保存すべきでない問題タイプであった場合は選択肢は保存されない()
    {
        $question = factory(Question::class)->create([
            'type' => $this->faker->randomElement(
                Question::SHOULD_NOT_SAVE_OPTIONS_QUESTION_TYPES
            ),
            'options' => null,
            'form_id' => $this->form->id
        ]);
        $this->questions_service->updateQuestion(
            $question->id,
            [
                'is_required' => $question->is_required,
                'options' => "テスト1\nテスト2\nテスト3"
            ]
        );

        $question_fields = $question->only(['id', 'options']);
        $this->assertDatabaseHas('questions', $question_fields);

        $this->assertEquals(0, Option::all()->count());
    }

    /** @test */
    public function deleteQuestion_正常に質問を削除できる()
    {
        $array = $this->createQuestionAndOptions();
        /* @var $question Question */
        $question = $array['question'];
        $options = $array['options'];

        $this->questions_service->deleteQuestion($question->id);

        // 質問は消えているはず
        $this->assertDeleted($question);
        // 選択肢も消えているはず
        $this->assertDeleted($options['option_1']);
        $this->assertDeleted($options['option_2']);
        $this->assertDeleted($options['option_3']);
        // TODO: AnswerDetailsのテストも書く
    }
}
