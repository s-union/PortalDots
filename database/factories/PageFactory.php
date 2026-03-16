<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Page;
use Illuminate\Database\Eloquent\Factory;

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
