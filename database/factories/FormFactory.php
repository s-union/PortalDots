<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Form;
use Illuminate\Database\Eloquent\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Eloquents\Form>
 */
class FormFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Form::class;

    public function definition()
    {
        return [
            'name' => fake()->name,
            'description' => fake()->text,
            'open_at' => now()->subMonth(),
            'close_at' => now()->addMonth(),
            'type' => 'circle',
            'max_answers' => 1,
            'is_public' => true,
        ];
    }

    public function private()
    {
        return $this->state([
            'is_public' => false,
        ]);
    }
}
