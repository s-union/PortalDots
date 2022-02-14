@if (!$circle->hasSubmitted())
    <app-badge muted outline>未提出</app-badge>
@elseif ($circle->isPending())
    <app-badge success outline>企画参加登録費支払待ち</app-badge>
@elseif ($circle->hasApproved())
    <app-badge success>受理</app-badge>
@elseif ($circle->hasRejected())
    <app-badge danger>不受理</app-badge>
@endif
