<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddAttendanceTypeToCircles extends Migration
{
    public function up()
    {
        Schema::table('circles', function (Blueprint $table) {
            $table->string('attendance_type')
                ->nullable()
                ->default('')
                ->after('group_name_yomi');
        });
    }

    public function down()
    {
        Schema::table('circles', function (Blueprint $table) {
            $table->dropColumn('attendance_type');
        });
    }
}
