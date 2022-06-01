@component('mail::message')
# 企画参加登録を提出しました
{{ $group->group_name }} 様

以下の内容で企画参加登録を提出しました

続いて、企画参加登録費のお支払いをお願いいたします。

企画参加登録費は、6月13日(月)〜6月17日(金)の18:15〜19:15に、部室棟E-209にてお支払いください。

なお、内容確認のためご連絡を差し上げる場合がございますので、あらかじめご了承ください。
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
