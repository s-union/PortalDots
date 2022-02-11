<?php

namespace Tests\Feature\Eloquents;

use App\Eloquents\Option;
use App\Eloquents\Question;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuestionTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function getOptionsArrayAttribute_正常に配列が返される()
    {
        $question = factory(Question::class)->create([
            'options' => "テスト1\nテスト2\nテスト3"
        ]);
        $this->assertEquals(
            ['テスト1', 'テスト2', 'テスト3'],
            $question->getOptionsArrayAttribute()
        );
    }

    /** @test */
    public function getOptionsArrayAttribute_OptionがNULLのときにNULLが返される()
    {
        $question = factory(Question::class)->create([
            'options' => null
        ]);
        $this->assertNull($question->getOptionsArrayAttribute());
    }

    /** @test */
    public function eloquentOptions_正常にOptionが取得できる()
    {
        $question = factory(Question::class)->create();
        factory(Option::class, 10)->create([
            'question_id' => $question->id
        ]);

        $this->assertEquals(10, $question->eloquentOptions->count());
    }
}
