@if ($question->type === 'heading')
<hr />

## {{ $question->name }}
@isset ($question->description){{ $question->description }}@endisset
@else

<h3>{{ $question->name }}</h3>

@if (empty($answer_details[$question->id]))
—{{-- 未回答  --}}
@elseif ($question->type === 'checkbox')
@foreach ($answer_details[$question->id] as $detail)
- {{ $detail }}
@endforeach
@elseif ($question->type === 'upload')
✓アップロード済 — [アップロードしたファイルをダウンロード]({{ route('forms.answers.uploads.show', ['form' => $form, 'answer' => $answer, 'question' => $question]) }})
@elseif ($question->type === 'markdown')
{!! App\Services\Utils\ParseMarkdownService::render($answer_details[$question->id]) !!}
@else
{!! nl2br(e($answer_details[$question->id])) !!}
@endif
@endif
<br />
