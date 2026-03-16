<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Answer;
use App\Eloquents\Circle;
use App\Eloquents\Form;
use Illuminate\Database\Eloquent\Factory;

class AnswerFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Answer::class;

    public function definition()
    {
        return [
            'form_id' => function () {
                return Form::factory()->create()->id;
            },
            'circle_id' => function () {
                return Circle::factory()->create()->id;
            },
        ];
    }
}
