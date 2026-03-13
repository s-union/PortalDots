<?php

declare(strict_types=1);

namespace App\Services\Utils;

use App;
use cebe\markdown\GithubMarkdown as Parser;

class ParseMarkdownService
{
    public static function render(?string $markdown): string
    {
        if (empty($markdown)) {
            return '';
        }
        $parser = App::make(Parser::class);
        $parser->enableNewlines = true;
        $html = $parser->parse($markdown);

        // XSS対策のため、HTMLPurifier を使ってサニタイズを行う
        $config = \HTMLPurifier_Config::createDefault();
        $config->set('Core.Encoding', 'UTF-8');
        $config->set('HTML.Doctype', 'HTML 4.01 Transitional');
        $purifier = new \HTMLPurifier($config);

        return $purifier->purify($html);
    }
}
