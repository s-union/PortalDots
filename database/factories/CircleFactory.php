<?php

/** @var \Illuminate\Database\Eloquent\Factory $factory */

use App\Consts\CircleConsts;
use App\Eloquents\Circle;
use Faker\Generator as Faker;

$factory->define(Circle::class, function (Faker $faker) {
    return [
        'name' => $faker->name,
        'name_yomi' => $faker->kanaName,
        'group_name' => $faker->name,
        'group_name_yomi' => $faker->kanaName,
        'attendance_type' => $faker->randomElement(
            array_merge(
                CircleConsts::CIRCLE_ATTENDANCE_TYPES_V1,
                CircleConsts::CIRCLE_ATTENDANCE_TYPES_V2
            )
        ),
        'submitted_at' => now(),
        'status' => 'approved'
    ];
});

$factory->state(Circle::class, 'rejected', [
    'status' => 'rejected',
]);

$factory->state(Circle::class, 'notSubmitted', [
    'submitted_at' => null,
    'status' => null,
    'invitation_token' => bin2hex(random_bytes(16)),
]);
