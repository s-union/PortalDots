<?php

namespace Database\Seeders;

use App\Eloquents\Tag;
use Illuminate\Database\Seeder;

class TagsSeeder extends Seeder
{
    public function run()
    {
        Tag::create([
            'name' => '飲食販売'
        ]);
        Tag::create([
            'name' => '物品販売'
        ]);
        Tag::create([
            'name' => '展示・実演(収入あり)'
        ]);
        Tag::create([
            'name' => '展示・実演(収入なし)'
        ]);
    }
}
