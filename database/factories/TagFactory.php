<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Tag;
use Illuminate\Database\Eloquent\Factory;

class TagFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Tag::class;

    public function definition()
    {
        return [
            // 同じnameが2つ以上生成されないよう、乱数を追加する
            'name' => $this->faker->name.strval(mt_rand(0, 10000)),
        ];
    }
}
