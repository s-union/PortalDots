<?php

namespace Database\Factories;

/** @var \Illuminate\Database\Eloquent\Factory $factory */

use App\Eloquents\Email;
use Faker\Generator as Faker;

class EmailFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Email::class;
    public function definition()
    {
        return [
            'subject' => $this->faker->text,
            'body' => $this->faker->text,
            'email_to' => $this->faker->email,
            'email_to_name' => $this->faker->name,
            'locked_at' => null,
            'sent_at' => null,
            'count_failed' => 0,
        ];
    }
}
