<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Circle;
use App\Eloquents\ParticipationType;
use Illuminate\Database\Eloquent\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Eloquents\Circle>
 */
class CircleFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Circle::class;

    public function definition()
    {
        return [
            'participation_type_id' => fn() => ParticipationType::factory()->create()->id,
            'name' => fake()->name,
            'name_yomi' => fake()->kanaName,
            'group_name' => fake()->name,
            'group_name_yomi' => fake()->kanaName,
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
