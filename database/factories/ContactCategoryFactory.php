<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\ContactCategory;
use Illuminate\Database\Eloquent\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Eloquents\ContactCategory>
 */
class ContactCategoryFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = ContactCategory::class;

    public function definition()
    {
        return [
            'name' => fake()->name,
            'email' => fake()->email,
        ];
    }
}
