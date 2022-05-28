@component('mail::message')
# 理大祭参加登録を提出・受理しました
{{ $group->group_name }} 様

以下の内容で理大祭参加登録を提出・受理しました。
{{ config('portal.admin_name') }}より、内容確認のためご連絡を差し上げる場合がございます。

続いて、「企画参加登録」の手続きをお願いいたします。

@component('mail::panel')
- 団体名 : {{ $group->group_name }}
- 団体名(よみ) : {{ $group->group_name_yomi }}
- メンバー
@foreach($group->users as $user)
@if($user->pivot->is_leader === true)
    - {{ $user->name }}({{ $user->student_id }}) (責任者)
@else
    - {{ $user->name }}({{ $user->student_id }})
@endif
@endforeach
@endcomponent
@endcomponent
