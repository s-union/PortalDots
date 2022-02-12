@component('mail::message')
# 企画参加登録が受理されました
{{ $circle->group_name }} 様

「{{ $circle->name }}」の参加登録が**受理**されました！

## 企画の内容
@component('mail::panel')
- 団体名 : {{ $circle->name }}
- 団体名(よみ) : {{ $circle->name_yomi }}
- 出店を企画する団体の名称 : {{ $circle->group_name }}
- 出店を企画する団体の名称(よみ) : {{ $circle->group_name_yomi}}
- メンバー
@foreach ($circle->users as $user)
@if($user->pivot->is_leader === true)
  - {{ $user->name }}({{ $user->student_id }}) (団体責任者)
@else
  - {{ $user->name }}({{ $user->student_id }})
@endif
@endforeach
@endcomponent
@endcomponent
