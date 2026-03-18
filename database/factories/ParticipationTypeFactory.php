<?php

namespace Database\Factories;

use App\Eloquents\Form;
use App\Eloquents\ParticipationType;
use App\Model;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Model>
 */
class ParticipationTypeFactory extends Factory
{
    protected $model = ParticipationType::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        $usersCountMin = fake()->numberBetween(1, 100);

        return [
            'name' => fake()->name(),
            'description' => fake()->paragraph(),
            'users_count_min' => $usersCountMin,
            'users_count_max' => fake()->numberBetween($usersCountMin, 100),
            'form_id' => fn() => Form::factory()->create()->id,
        ];
    }
}
