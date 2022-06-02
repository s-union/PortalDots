<?php

namespace App\Http\Controllers\Groups\Users;

use App\Eloquents\Group;
use App\Http\Controllers\Controller;
use BaconQrCode\Exception\RuntimeException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class IndexAction extends Controller
{
    public function __invoke(Group $group, Request $request)
    {
        $this->authorize('group.update', $group);

        if (!Auth::user()->isLeaderInGroup($group)) {
            abort(403);
        }

        $group->load('users');
        $invitation_url = route('groups.users.invite', [
            'group' => $group,
            'token' => $group->invitation_token
        ]);
        $invitation_url_for_blade = str_replace('"', '', \json_encode($invitation_url, JSON_UNESCAPED_SLASHES));

        $qrcode_html = '';

        try {
            $qrcode_html = QrCode::margin(0)
                ->size(180)
                ->backgroundColor(255, 255, 255, 0)
                ->generate($invitation_url_for_blade);
        } catch (RuntimeException $e) {
            $qrcode_html = '';
        }

        return view('groups.users.index')
            ->with('group', $group)
            ->with('invitation_url', $invitation_url_for_blade)
            ->with('qrcode_html', $qrcode_html)
            ->with('share_json', \json_encode([
                'url' => $invitation_url,
            ], JSON_UNESCAPED_SLASHES));
    }
}
