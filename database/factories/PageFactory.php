<?php

namespace Database\Factories;

/** @var \Illuminate\Database\Eloquent\Factory $factory */

use App\Eloquents\Page;
use Faker\Generator as Faker;

class PageFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Page::class;
    public function definition()
    {
        return [
            'title' => $this->faker->name,
            'body' => $this->faker->text,
            'is_pinned' => false,
            'is_public' => true,
        ];
    }
}
