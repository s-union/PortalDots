<?php

use App\Eloquents\Option;
use Faker\Generator as Faker;
use Illuminate\Support\Carbon;

/** @var \Illuminate\Database\Eloquent\Factory $factory */
$factory->define(Option::class, function (Faker $faker) {
    return [
        'question_id' => $faker->randomNumber(),
        'name' => $faker->name(),
        'created_at' => Carbon::now(),
        'updated_at' => Carbon::now(),
    ];
});
