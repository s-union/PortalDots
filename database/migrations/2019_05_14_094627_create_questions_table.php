<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('form_id');
            $table->string('name')->nullable();
            $table->text('description')->nullable();
            $table->string('type');
            $table->boolean('is_required')->default(false);
            $table->integer('number_min')->nullable();
            $table->integer('number_max')->nullable();
            $table->string('allowed_types')->nullable();
            $table->integer('priority')->nullable();
            $table->timestamps();
        });
    }
    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('questions');
    }
};
