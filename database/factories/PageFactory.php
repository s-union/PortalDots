<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Page;
use Illuminate\Database\Eloquent\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Eloquents\Page>
 */
class PageFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Page::class;

    public function definition()
    {
        return [
            'title' => fake()->name,
            'body' => fake()->text,
            'is_pinned' => false,
            'is_public' => true,
        ];
    }
}
