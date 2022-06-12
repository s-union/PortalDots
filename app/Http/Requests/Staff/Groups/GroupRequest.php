<?php

namespace App\Http\Requests\Staff\Groups;

use App\Eloquents\Group;
use App\Eloquents\User;
use Illuminate\Foundation\Http\FormRequest;

class GroupRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'group_name' => Group::GROUP_NAME_RULES,
            'group_name_yomi' => Group::GROUP_NAME_YOMI_RULES,
            'leader' => ['nullable', 'exists:users,student_id'],
            'members' => ['nullable']
        ];
    }

    public function authorize(): bool
    {
        return true;
    }

    public function attributes()
    {
        return [
            'group_name' => '団体名',
            'group_name_yomi' => '団体名(よみ)',
            'leader' => '団体責任者',
            'members' => '学園祭係(副責任者)'
        ];
    }

    public function messages()
    {
        return [
            'group_name_yomi.regix' => 'ひらがなで入力してください',
            'leader.exists' => 'この' . config('portal.student_id_name') . 'は登録されていません'
        ];
    }

    /**
     * バリデーション通過後に以下のバリデーションが検証される
     */
    public function withValidator($validator)
    {
        $unverified_student_ids = [];

        $non_registered_member_ids = str_replace(["\r\n", "\r", "\n"], "\n", $this->members);
        $non_registered_member_ids = explode("\n", $non_registered_member_ids);
        $non_registered_member_ids = array_filter($non_registered_member_ids, "strlen");

        $members = User::whereIn('student_id', $non_registered_member_ids)->get();
        foreach ($members as $member) {
            $non_registered_member_ids = array_diff($non_registered_member_ids, [$member->student_id]);
            if (!$member->areBothEmailsVerified()) {
                $unverified_student_ids[] = $member->student_id;
            }
        }
        $validator->after(function ($validator) use ($non_registered_member_ids, $unverified_student_ids) {
            if (!empty($non_registered_member_ids)) {
                $validator->errors()->add('members', '未登録 : ' . implode(' ', $non_registered_member_ids));
            }

            if (!empty($unverified_student_ids)) {
                $validator->errors()->add('members', 'メール未認証 : ' . implode(' ', $unverified_student_ids));
            }
        });
    }
}
