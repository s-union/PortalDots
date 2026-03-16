<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Form;
use App\Eloquents\Question;
use Illuminate\Database\Eloquent\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Eloquents\Question>
 */
class QuestionFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Question::class;

    public function definition()
    {
        $options = <<< 'EOL'
Option A
Option B
Option C
Option D
Other
EOL;

        static $priority = 0;
        $type = fake()->randomElement([
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
            'form_id' => fn() => Form::factory()->create()->id,
            'name' => fake()->name,
            'description' => fake()->text,
            'type' => $type,
            'is_required' => fake()->boolean,
            'number_min' => mt_rand(0, 40),
            'number_max' => mt_rand(50, 100),
            'allowed_types' => ($type === 'upload' ? 'png|jpg|jpeg|gif' : null),
            'options' => (in_array($type, ['radio', 'select', 'checkbox'], true) ? $options : null),
            'priority' => ++$priority,
        ];
    }
}
