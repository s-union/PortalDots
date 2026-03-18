<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Answer;
use App\Eloquents\Circle;
use App\Eloquents\Form;
use Illuminate\Database\Eloquent\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Eloquents\Answer>
 */
class AnswerFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Answer::class;

    public function definition()
    {
        return [
            'form_id' => fn() => Form::factory()->create()->id,
            'circle_id' => fn() => Circle::factory()->create()->id,
        ];
    }
}
