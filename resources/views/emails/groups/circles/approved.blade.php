@component('mail::message')
# 企画参加登録が受理されました
{{ $group->group_name }} 様

「{{ $group->group_name }}」の企画参加登録が**受理**されました！

## 企画の内容
@component('mail::panel')
- 団体名 : {{ $group->group_name }}
- 団体名(よみ) : {{ $group->group_name_yomi }}
- メンバー
@foreach ($group->users as $user)
@if ($user->pivot->is_leader === true)
    - {{ $user->name }}({{ $user->student_id }}) (責任者)
@else
    - {{ $user->name }}({{ $user->student_id }})
@endif
@endforeach
@endcomponent

@if ($group->food_booth)
- 飲食販売 : 参加する(ブース数 : {{ $group->food_booth }}個)
@else
- 飲食販売 : 参加しない
@endif

@if ($group->seller_booth)
- 物品販売 : 参加する(ブース数 : {{ $group->seller_booth }}個)
@else
- 物品販売 : 参加しない
@endif

@if ($group->exh_seller_booth)
- 展示・実演(収入あり) : 参加する(ブース数 : {{ $group->exh_seller_booth }}個)
@else
- 展示・実演(収入あり) : 参加しない
@endif

@if ($group->exh_booth)
- 展示・実演(収入なし) : 参加する(ブース数 : {{ $group->exh_booth }}個)
@else
- 展示・実演(収入なし) : 参加しない
@endif
@endcomponent
