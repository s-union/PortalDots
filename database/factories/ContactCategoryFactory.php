<?php

namespace Database\Factories;

/** @var \Illuminate\Database\Eloquent\Factory $factory */

use App\Eloquents\ContactCategory;
use Faker\Generator as Faker;

class ContactCategoryFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = ContactCategory::class;
    public function definition()
    {
        return [
            'name' => $this->faker->name,
            'email' => $this->faker->email
        ];
    }
}
