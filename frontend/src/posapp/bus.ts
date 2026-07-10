import mitt from "mitt";
import type { Emitter } from "mitt";
import type { App } from "vue";

export type Events = {
  [key: string]: any;
};

const bus: Emitter<Events> = mitt<Events>();

const eventBusPlugin = {
  emit: bus.emit.bind(bus),
  on: bus.on.bind(bus),
  off: bus.off.bind(bus),
  all: bus.all,
  install: (app: App) => {
    app.config.globalProperties.__ = window.__;
    app.config.globalProperties.frappe = window.frappe;
    app.config.globalProperties.eventBus = bus;

    // Provide for Composition API usage
    app.provide("eventBus", bus);
    app.provide("__", window.__);
    app.provide("frappe", window.frappe);
  },
};

export default eventBusPlugin;
export { bus };
