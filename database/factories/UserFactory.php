<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\User;
use Illuminate\Database\Eloquent\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Eloquents\User>
 */
class UserFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = User::class;

    public function definition()
    {
        return [
            'student_id' => Str::random(mt_rand(7, 20)),
            'name' => fake()->name,
            'name_yomi' => fake()->kanaName,
            'email' => fake()->unique()->safeEmail,
            'univemail_local_part' => fake()->slug,
            'univemail_domain_part' => fake()->safeEmailDomain,
            'tel' => fake()->phoneNumber,
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
