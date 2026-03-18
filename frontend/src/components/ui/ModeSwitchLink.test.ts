import { describe, expect, it } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import ModeSwitchLink from "./ModeSwitchLink.vue";

describe("ModeSwitchLink", () => {
    it("renders label and forwards to path", () => {
        const wrapper = mount(ModeSwitchLink, {
            props: {
                to: "/login",
                label: "ログインへ",
            },
            global: {
                stubs: {
                    RouterLink: RouterLinkStub,
                },
            },
        });

        expect(wrapper.getComponent(RouterLinkStub).props("to")).toBe("/login");
        expect(wrapper.text()).toContain("ログインへ");
    });
});
