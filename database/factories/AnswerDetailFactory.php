<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Answer;
use App\Eloquents\AnswerDetail;
use App\Eloquents\Question;
use Illuminate\Database\Eloquent\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Eloquents\AnswerDetail>
 */
class AnswerDetailFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = AnswerDetail::class;

    public function definition()
    {
        return [
            'answer_id' => fn() => Answer::factory()->create()->id,
            'question_id' => fn() => Question::factory()->create()->id,
            'answer' => fake()->paragraph(),
        ];
    }
}
