<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class DropGroupNameAndGroupNameYomiColumnsFromCircles extends Migration
{
    public function up()
    {
        Schema::table('circles', function (Blueprint $table) {
            $table->dropColumn('group_name');
            $table->dropColumn('group_name_yomi');
        });
    }

    public function down()
    {
        Schema::table('circles', function (Blueprint $table) {
            $table->string('group_name');
            $table->string('group_name_yomi');
        });
    }
}
