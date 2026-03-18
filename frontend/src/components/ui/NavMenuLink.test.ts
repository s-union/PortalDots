import { describe, expect, it } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import NavMenuLink from "./NavMenuLink.vue";

describe("NavMenuLink", () => {
    it("renders label and icon", () => {
        const wrapper = mount(NavMenuLink, {
            props: {
                to: "/staff",
                label: "スタッフ",
                iconClass: "fas fa-user",
            },
            global: {
                stubs: {
                    RouterLink: RouterLinkStub,
                },
            },
        });

        expect(wrapper.getComponent(RouterLinkStub).props("to")).toBe("/staff");
        expect(wrapper.text()).toContain("スタッフ");
        expect(wrapper.find("i.fas.fa-user").exists()).toBe(true);
    });

    it("shows active indicator when active", () => {
        const wrapper = mount(NavMenuLink, {
            props: {
                to: "/staff",
                label: "スタッフ",
                active: true,
            },
            global: {
                stubs: {
                    RouterLink: RouterLinkStub,
                },
            },
        });

        expect(wrapper.find("span.absolute.right-0").exists()).toBe(true);
    });
});
