"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Component: () => Component,
  Fragment: () => fragment,
  jsx: () => jsx,
  jsxDEV: () => jsx,
  jsxs: () => jsx
});
module.exports = __toCommonJS(index_exports);

// src/component/index.ts
var Component = class {
  constructor(props = {}) {
    this.props = props;
  }
};

// src/jsx/index.ts
var import_core = require("@pjsx/core");
function observeLifecycle(element, component) {
  const parent = component.props.__parent;
  (0, import_core.lazyPeek)((self) => new MutationObserver((mutations) => {
    mutations.forEach(({ addedNodes, removedNodes }) => {
      if (Array.from(addedNodes).includes(element)) component.onMount?.();
      if (Array.from(removedNodes).includes(element)) {
        component.onUnmount?.();
        self().disconnect();
      }
    });
  })).peek((val) => val.observe(parent || document.body, { childList: true, subtree: true }));
}
function jsx(tag, props) {
  console.log("jsx:", tag, props);
  const element = function createElement(tag2) {
    const type = typeof tag2;
    switch (type) {
      case "string":
        return (0, import_core.lazyPeek)(() => {
          try {
            return document.createElement(tag2);
          } catch (e) {
            return document.createTextNode(tag2);
          }
        }).get();
      case "function":
        return (0, import_core.peek)(tag2).map((tag3) => {
          if (/^class\s/.test(String(tag3) || "")) {
            const component = new tag3(props);
            component.beforeMount?.();
            const element2 = component.render();
            const children = props?.children || [];
            const onMount = component.onMount;
            component.onMount = () => {
              children.forEach((value) => element2.appendChild(value));
              onMount?.();
            };
            observeLifecycle(element2, component);
            return element2;
          } else {
            return tag3(props);
          }
        }).get();
      default:
        return jsx(String(tag2), props);
    }
  }(tag);
  if (element instanceof HTMLElement) {
    for (const [key, value] of Object.entries(props)) {
      if (key == "children") {
        (0, import_core.peek)(value).map((val) => (Array.isArray(val) ? val : [val]).map((val2) => {
          if (val2 instanceof Node) return val2;
          return jsx(val2, {});
        })).get().forEach((val) => {
          if (val instanceof Node) {
            element.appendChild(val);
          }
        });
      } else if (key.startsWith("on") && typeof value === "function") {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key in element) {
        element[key] = value;
      } else {
        element.setAttribute(key, String(value));
      }
    }
  }
  return element;
}
function fragment(props) {
  return jsx(document.createDocumentFragment, props);
}

// src/index.ts
__reExport(index_exports, require("@pjsx/core"), module.exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Component,
  Fragment,
  jsx,
  jsxDEV,
  jsxs,
  ...require("@pjsx/core")
});
//# sourceMappingURL=index.js.map