<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Place;
use Illuminate\Database\Eloquent\Factory;

class PlaceFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Place::class;

    public function definition()
    {
        return [
            'name' => $this->faker->name,
            'type' => $this->faker->numberBetween(1, 3),
        ];
    }
}
