<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Circle;
use App\Eloquents\ParticipationType;
use Illuminate\Database\Eloquent\Factory;

class CircleFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Circle::class;

    public function definition()
    {
        return [
            'participation_type_id' => function () {
                return ParticipationType::factory()->create()->id;
            },
            'name' => $this->faker->name,
            'name_yomi' => $this->faker->kanaName,
            'group_name' => $this->faker->name,
            'group_name_yomi' => $this->faker->kanaName,
            'submitted_at' => now(),
            'status' => 'approved',
        ];
    }

    public function rejected()
    {
        return $this->state([
            'status' => 'rejected',
        ]);
    }

    public function notSubmitted()
    {
        return $this->state([
            'submitted_at' => null,
            'status' => null,
            'invitation_token' => bin2hex(random_bytes(16)),
        ]);
    }
}
