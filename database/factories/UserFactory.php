<?php

namespace Database\Factories;

/** @var \Illuminate\Database\Eloquent\Factory $factory */

use App\Eloquents\User;
use Faker\Generator as Faker;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
class UserFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = User::class;
    public function definition()
    {
        return [
            'student_id' => Str::random(mt_rand(7, 20)),
            'name' => $this->faker->name,
            'name_yomi' => $this->faker->kanaName,
            'email' => $this->faker->unique()->safeEmail,
            'univemail_local_part' => $this->faker->slug,
            'univemail_domain_part' => $this->faker->safeEmailDomain,
            'tel' => $this->faker->phoneNumber,
            'is_staff' => false,
            'is_admin' => false,
            'email_verified_at' => now(),
            'univemail_verified_at' => now(),
            'signed_up_at' => now(),
            'last_accessed_at' => now(),
            'password' => Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }
    public function staff()
    {
        return $this->state([
            'is_staff' => true,
            'is_admin' => false,
        ]);
    }
    public function admin()
    {
        return $this->state([
            'is_staff' => true,
            'is_admin' => true,
        ]);
    }
    public function not_verified()
    {
        return $this->state([
            'email_verified_at' => null,
            'univemail_verified_at' => null,
            'signed_up_at' => null,
        ]);
    }
}
