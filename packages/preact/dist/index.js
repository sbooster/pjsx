"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Fragment: () => Fragment2,
  jsx: () => jsx2,
  jsxDEV: () => jsx2,
  jsxs: () => jsx2
});
module.exports = __toCommonJS(index_exports);
var preactRuntime = __toESM(require("preact/jsx-runtime"));
var import_hooks = require("preact/hooks");
var import_core = require("@pjsx/core");
var import_signals = require("@preact/signals");
function isPublisher(props) {
  return typeof props == "object" && typeof props?.subscribe == "function";
}
function jsx2(tag, props, key) {
  const unwrap = (props2) => {
    if (props2 == null) return props2;
    if (Array.isArray(props2)) return props2.map((props3) => unwrap(props3));
    if (isPublisher(props2)) return (0, import_core.peek)((0, import_signals.signal)()).peek((signal2) => {
      (0, import_hooks.useEffect)(() => {
        const sub = import_core.Flux.from(props2).distinctUntilChanged().subscribe({
          onNext(value) {
            signal2.value = value;
          },
          onError(error) {
            console.error(error);
          }
        });
        sub.request(Number.MAX_SAFE_INTEGER);
        return () => {
          sub.unsubscribe();
        };
      }, [tag]);
    }).get();
    if (typeof props2 == "object") {
      for (let key2 of Object.keys(props2)) {
        if (key2 == "props" || key2.startsWith("_")) continue;
        if (props2[key2] == null) continue;
        props2[key2] = unwrap(props2[key2]);
      }
      return props2;
    }
    return props2;
  };
  return preactRuntime.jsx(tag, unwrap(props), key);
}
var Fragment2 = preactRuntime.Fragment;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Fragment,
  jsx,
  jsxDEV,
  jsxs
});
//# sourceMappingURL=index.js.map