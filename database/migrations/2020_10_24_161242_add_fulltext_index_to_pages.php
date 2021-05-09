<?php

use App\Eloquents\Page;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class AddFulltextIndexToPages extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (Page::isFulltextIndexSupported()) {
            DB::statement('ALTER TABLE pages ADD FULLTEXT INDEX fulltext_index (title,body) WITH PARSER ngram');
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        if (Page::isFulltextIndexSupported()) {
            DB::statement('ALTER TABLE pages DROP INDEX fulltext_index');
        }
    }
}
