// src/component/index.ts
var Component = class {
  constructor(props = {}) {
    this.props = props;
  }
};

// src/jsx/index.ts
import { lazyPeek, peek } from "@pjsx/core";
function observeLifecycle(element, component) {
  const parent = component.props.__parent;
  lazyPeek((self) => new MutationObserver((mutations) => {
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
        return lazyPeek(() => {
          try {
            return document.createElement(tag2);
          } catch (e) {
            return document.createTextNode(tag2);
          }
        }).get();
      case "function":
        return peek(tag2).map((tag3) => {
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
        peek(value).map((val) => (Array.isArray(val) ? val : [val]).map((val2) => {
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
export * from "@pjsx/core";
export {
  Component,
  fragment as Fragment,
  jsx,
  jsx as jsxDEV,
  jsx as jsxs
};
//# sourceMappingURL=index.mjs.map