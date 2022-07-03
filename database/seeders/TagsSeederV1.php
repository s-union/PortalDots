<?php

namespace Database\Seeders;

use App\Consts\CircleConsts;
use App\Eloquents\Tag;
use Illuminate\Database\Seeder;

class TagsSeederV1 extends Seeder
{
    public function run()
    {
        foreach (CircleConsts::CIRCLE_ATTENDANCE_TYPES_V1 as $value) {
            Tag::create([
                'name' => $value
            ]);
        }
    }
}
