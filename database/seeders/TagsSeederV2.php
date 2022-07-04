<?php

namespace Database\Seeders;

use App\Consts\CircleConsts;
use App\Eloquents\Tag;
use Illuminate\Database\Seeder;

class TagsSeederV2 extends Seeder
{
    public function run()
    {
        foreach (CircleConsts::CIRCLE_ATTENDANCE_TYPES_V2 as $value) {
            Tag::create([
                'name' => $value
            ]);
        }
    }
}
