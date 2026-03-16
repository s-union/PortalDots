<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Form;
use Illuminate\Database\Eloquent\Factory;

class FormFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Form::class;

    public function definition()
    {
        return [
            'name' => $this->faker->name,
            'description' => $this->faker->text,
            'open_at' => now()->subMonth(1),
            'close_at' => now()->addMonth(1),
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
