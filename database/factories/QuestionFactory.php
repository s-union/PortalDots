<?php

namespace Database\Factories;

/** @var \Illuminate\Database\Eloquent\Factory $factory */

use App\Eloquents\Question;
use App\Eloquents\Form;
use Faker\Generator as Faker;

class QuestionFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Question::class;
    public function definition()
    {
        $options = <<< EOL
Option A
Option B
Option C
Option D
Other
EOL;

        static $priority = 0;
        $type = $this->faker->randomElement([
                    'heading',
                    'text',
                    'textarea',
                    'number',
                    'radio',
                    'select',
                    'checkbox',
                    'upload',
                ]);
        return [
            'form_id' => function() {
                return Form::factory()->create()->id;
            },
            'name' => $this->faker->name,
            'description' => $this->faker->text,
            'type' => $type,
            'is_required' => $this->faker->boolean,
            'number_min' => mt_rand(0, 40),
            'number_max' => mt_rand(50, 100),
            'allowed_types' => ($type === 'upload' ? 'png|jpg|jpeg|gif' : null),
            'options' => (in_array($type, ['radio', 'select', 'checkbox'], true) ? $options : null),
            'priority' => ++$priority,
        ];
    }
}
