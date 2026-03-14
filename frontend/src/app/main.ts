import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import App from "@/app/App.vue";
import { pinia } from "@/app/providers/pinia";
import { router } from "@/app/router";
import { queryClient } from "@/app/providers/queryClient";
import "@/styles/app.css";

const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(VueQueryPlugin, { queryClient });

app.mount("#app");
