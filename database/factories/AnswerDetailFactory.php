<?php

namespace Database\Factories;

/** @var \Illuminate\Database\Eloquent\Factory $factory */

use App\Eloquents\AnswerDetail;
use App\Eloquents\Answer;
use App\Eloquents\Question;
use Faker\Generator as Faker;

class AnswerDetailFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = AnswerDetail::class;
    public function definition()
    {
        return [
            'answer_id' => function() {
                return Answer::factory()->create()->id;
            },
            'question_id' => function() {
                return Question::factory()->create()->id;
            },
            'answer' => $this->faker->paragraph(),
        ];
    }
}
