<?php

use App\Eloquents\Option;
use App\Eloquents\Question;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateQuestionOptionsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('options', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('question_id');
            $table->foreign('question_id')
                ->references('id')->on('questions')
                ->onDelete('cascade');
            $table->string('name');
            $table->timestamps();
        });
        /* データ移行 */
        $questions = Question::all();
        foreach ($questions as $question) {
            $array_options = $question->getOptionsArrayAttribute();
            if ($array_options != null) {
                foreach ($array_options as $option) {
                    Option::create([
                        'question_id' => $question->id,
                        'name' => $option
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('options');
    }
}
