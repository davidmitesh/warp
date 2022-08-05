"use strict";(self.webpackChunkjuno_docs=self.webpackChunkjuno_docs||[]).push([[1826],{3905:(e,t,n)=>{n.d(t,{Zo:()=>l,kt:()=>h});var r=n(7294);function o(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){o(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function c(e,t){if(null==e)return{};var n,r,o=function(e,t){if(null==e)return{};var n,r,o={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(o[n]=e[n]);return o}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(o[n]=e[n])}return o}var s=r.createContext({}),p=function(e){var t=r.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},l=function(e){var t=p(e.components);return r.createElement(s.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},u=r.forwardRef((function(e,t){var n=e.components,o=e.mdxType,a=e.originalType,s=e.parentName,l=c(e,["components","mdxType","originalType","parentName"]),u=p(n),h=o,f=u["".concat(s,".").concat(h)]||u[h]||m[h]||a;return n?r.createElement(f,i(i({ref:t},l),{},{components:n})):r.createElement(f,i({ref:t},l))}));function h(e,t){var n=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var a=n.length,i=new Array(a);i[0]=u;var c={};for(var s in t)hasOwnProperty.call(t,s)&&(c[s]=t[s]);c.originalType=e,c.mdxType="string"==typeof e?e:o,i[1]=c;for(var p=2;p<a;p++)i[p]=n[p];return r.createElement.apply(null,i)}return r.createElement.apply(null,n)}u.displayName="MDXCreateElement"},379:(e,t,n)=>{n.r(t),n.d(t,{contentTitle:()=>i,default:()=>l,frontMatter:()=>a,metadata:()=>c,toc:()=>s});var r=n(7462),o=(n(7294),n(3905));const a={title:"JSON-RPC Improvements"},i=void 0,c={unversionedId:"future_implementations/jsonrpc-improving",id:"future_implementations/jsonrpc-improving",title:"JSON-RPC Improvements",description:"Currently, we have an implementation of JSON-RPC to handle incoming connections of",source:"@site/docs/future_implementations/jsonrpc-improving.mdx",sourceDirName:"future_implementations",slug:"/future_implementations/jsonrpc-improving",permalink:"/warp/docs/future_implementations/jsonrpc-improving",editUrl:"https://github.com/davidmitesh/warp/tree/main/docs/docs/future_implementations/jsonrpc-improving.mdx",tags:[],version:"current",frontMatter:{title:"JSON-RPC Improvements"},sidebar:"tutorialSidebar",previous:{title:"Future Implementations",permalink:"/warp/docs/category/future-implementations"},next:{title:"Running",permalink:"/warp/docs/category/running"}},s=[{value:"Benchmarking",id:"benchmarking",children:[],level:3}],p={toc:s};function l(e){let{components:t,...n}=e;return(0,o.kt)("wrapper",(0,r.Z)({},p,n,{components:t,mdxType:"MDXLayout"}),(0,o.kt)("p",null,"Currently, we have an implementation of JSON-RPC to handle incoming connections of\n",(0,o.kt)("a",{parentName:"p",href:"https://github.com/starkware-libs/starknet-specs"},"this form"),". We are currently testing it to make sure we create the fastest\nimplementation possible."),(0,o.kt)("p",null,"At the moment, each time a request is made to the server, we use reflection to check if the server contains this method, and in\ncase it contains the method, start the check of each of the in/out params of the method."),(0,o.kt)("p",null,"After that we execute the method, sending the marshalled params as input to the method."),(0,o.kt)("p",null,"In the current implementation, for every call of the method, we must make this computation."),(0,o.kt)("p",null,"Our proposal here is to make this computation before starting the RPC server, generating a callback dictionary that contains\nall existing methods which are pre-computed and saved in memory. In this way every time we make a request, we only need to check\nin the callback dictionary for the response to each method, and param types will be loaded, without creating the same object multiple times for the RPC to function"),(0,o.kt)("p",null,"Making this will allow us handle this hard problem to before the rpc start to handle connections."),(0,o.kt)("h3",{id:"benchmarking"},"Benchmarking"),(0,o.kt)("p",null,"Another approach is to use a different JSON RPC implementation, such as\n",(0,o.kt)("a",{parentName:"p",href:"https://golangexample.com/golang-implementation-of-json-rpc-2-0-server-with-generics/"},"this")," to create a generic rpc\nwrapper for methods, and establishin some constrains against params where possible."))}l.isMDXComponent=!0}}]);