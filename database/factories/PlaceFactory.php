<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Place;
use Illuminate\Database\Eloquent\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Eloquents\Place>
 */
class PlaceFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Place::class;

    public function definition()
    {
        return [
            'name' => fake()->name,
            'type' => fake()->numberBetween(1, 3),
        ];
    }
}
