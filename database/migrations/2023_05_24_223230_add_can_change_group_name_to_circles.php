<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('circles', function (Blueprint $table) {
            $table->boolean('can_change_group_name')->default(true)->after('group_name_yomi');
        });
    }

    public function down(): void
    {
        Schema::table('circles', function (Blueprint $table) {
            $table->dropColumn('can_change_group_name');
        });
    }
};
