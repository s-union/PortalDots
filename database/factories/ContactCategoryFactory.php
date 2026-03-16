<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\ContactCategory;
use Illuminate\Database\Eloquent\Factory;

class ContactCategoryFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = ContactCategory::class;

    public function definition()
    {
        return [
            'name' => $this->faker->name,
            'email' => $this->faker->email,
        ];
    }
}
