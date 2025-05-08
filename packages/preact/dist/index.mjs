// src/index.ts
import * as preactRuntime from "preact/jsx-runtime";
import { useEffect } from "preact/hooks";
import { Flux, peek } from "@pjsx/core";
import { signal } from "@preact/signals";
function isPublisher(props) {
  return typeof props == "object" && typeof props?.subscribe == "function";
}
function jsx2(tag, props, key) {
  const unwrap = (props2) => {
    if (props2 == null) return props2;
    if (Array.isArray(props2)) return props2.map((props3) => unwrap(props3));
    if (isPublisher(props2)) return peek(signal()).peek((signal2) => {
      useEffect(() => {
        const sub = Flux.from(props2).distinctUntilChanged().subscribe({
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
export {
  Fragment2 as Fragment,
  jsx2 as jsx,
  jsx2 as jsxDEV,
  jsx2 as jsxs
};
//# sourceMappingURL=index.mjs.map