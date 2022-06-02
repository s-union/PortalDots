<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateGroupUserTable extends Migration
{
    public function up()
    {
        Schema::create('group_user', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('group_id');
            $table->unsignedBigInteger('user_id');
            $table->unique(['group_id', 'user_id']);
            $table->boolean('is_leader')->default(false);
        });
    }

    public function down()
    {
        Schema::dropIfExists('group_user');
    }
}
