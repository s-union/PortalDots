<?php

declare(strict_types=1);

namespace Tests\Feature\Eloquents;

use App\Eloquents\Answer;
use App\Eloquents\AnswerDetail;
use App\Eloquents\Circle;
use App\Eloquents\Form;
use App\Eloquents\ParticipationType;
use App\Eloquents\Question;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CircleTest extends TestCase
{
    use RefreshDatabase;

    #[\PHPUnit\Framework\Attributes\Test]
    public function get_participation_form_answer()
    {
        // 準備
        $participationForm = Form::factory()->create();
        $participationType = ParticipationType::factory()->create([
            'form_id' => $participationForm->id,
        ]);
        $question = Question::factory()->create([
            'form_id' => $participationForm->id,
            'name' => '設問です',
            'type' => 'text',
        ]);

        $otherCircles = Circle::factory(10)->create([
            'participation_type_id' => $participationType->id,
        ]);
        $myCircle = Circle::factory()->create([
            'participation_type_id' => $participationType->id,
        ]);

        $i = 0;
        foreach ($otherCircles as $otherCircle) {
            $answer = Answer::factory()->create([
                'form_id' => $participationForm->id,
                'circle_id' => $otherCircle->id,
            ]);
            AnswerDetail::factory()->create([
                'answer_id' => $answer->id,
                'question_id' => $question->id,
            ]);
            $i++;

            if ($i === 5) {
                $myAnswer = Answer::factory()->create([
                    'form_id' => $participationForm->id,
                    'circle_id' => $myCircle->id,
                ]);
            }
        }
        AnswerDetail::factory()->create([
            'answer_id' => $myAnswer->id,
            'question_id' => $question->id,
        ]);

        // テスト
        $result = $myCircle->getParticipationFormAnswer();
        $this->assertSame($myAnswer->id, $result->id);
    }
}
