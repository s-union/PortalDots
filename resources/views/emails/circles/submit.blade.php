@component('mail::message')
# 企画参加登録を提出しました
{{ $circle->name }} 様

以下の内容で企画参加登録を提出しました
@component('mail::panel')
- 団体名 : {{ $circle->name }}
- 団体名(ふりがな) : {{ $circle->name_yomi }}
- メンバー
@foreach ($circle->users as $user)
@if($user->pivot->is_leader === true)
  - {{ $user->name }}({{ $user->student_id }}) (団体責任者)
@else
  - {{ $user->name }}({{ $user->student_id }})
@endif
@endforeach
@endcomponent


{{ config('portal.admin_name') }}より指示がある場合は従ってください。
また、内容確認のためご連絡を差し上げる場合がございます。
@endcomponent
