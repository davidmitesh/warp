"use strict";(self.webpackChunkjuno_docs=self.webpackChunkjuno_docs||[]).push([[6840],{3905:(e,t,r)=>{r.d(t,{Zo:()=>l,kt:()=>f});var n=r(7294);function o(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function a(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function i(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?a(Object(r),!0).forEach((function(t){o(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):a(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function p(e,t){if(null==e)return{};var r,n,o=function(e,t){if(null==e)return{};var r,n,o={},a=Object.keys(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||(o[r]=e[r]);return o}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(o[r]=e[r])}return o}var c=n.createContext({}),s=function(e){var t=n.useContext(c),r=t;return e&&(r="function"==typeof e?e(t):i(i({},t),e)),r},l=function(e){var t=s(e.components);return n.createElement(c.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},u=n.forwardRef((function(e,t){var r=e.components,o=e.mdxType,a=e.originalType,c=e.parentName,l=p(e,["components","mdxType","originalType","parentName"]),u=s(r),f=o,g=u["".concat(c,".").concat(f)]||u[f]||m[f]||a;return r?n.createElement(g,i(i({ref:t},l),{},{components:r})):n.createElement(g,i({ref:t},l))}));function f(e,t){var r=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var a=r.length,i=new Array(a);i[0]=u;var p={};for(var c in t)hasOwnProperty.call(t,c)&&(p[c]=t[c]);p.originalType=e,p.mdxType="string"==typeof e?e:o,i[1]=p;for(var s=2;s<a;s++)i[s]=r[s];return n.createElement.apply(null,i)}return n.createElement.apply(null,r)}u.displayName="MDXCreateElement"},1862:(e,t,r)=>{r.r(t),r.d(t,{contentTitle:()=>i,default:()=>l,frontMatter:()=>a,metadata:()=>p,toc:()=>c});var n=r(7462),o=(r(7294),r(3905));const a={title:"Format",description:"How formatting the files of the app"},i=void 0,p={unversionedId:"testing/format",id:"testing/format",title:"Format",description:"How formatting the files of the app",source:"@site/docs/testing/format.mdx",sourceDirName:"testing",slug:"/testing/format",permalink:"/warp/docs/testing/format",editUrl:"https://github.com/davidmitesh/warp/tree/main/docs/docs/testing/format.mdx",tags:[],version:"current",frontMatter:{title:"Format",description:"How formatting the files of the app"},sidebar:"tutorialSidebar",previous:{title:"Coverage",permalink:"/warp/docs/testing/coverage"},next:{title:"Testing",permalink:"/warp/docs/testing/"}},c=[],s={toc:c};function l(e){let{components:t,...r}=e;return(0,o.kt)("wrapper",(0,n.Z)({},s,r,{components:t,mdxType:"MDXLayout"}),(0,o.kt)("p",null,"For formatting we are using ",(0,o.kt)("a",{parentName:"p",href:"https://github.com/mvdan/gofumpt"},"gofumpt"),", a more strict gofmt."),(0,o.kt)("p",null,"To install ",(0,o.kt)("inlineCode",{parentName:"p"},"gofumpt"),", you can run the next command:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-bash"},"make install-gofumpt\n")),(0,o.kt)("p",null,"Then, to format your code you can use:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-bash"},"make format\n")),(0,o.kt)("p",null,"For most of the common editors like ",(0,o.kt)("a",{parentName:"p",href:"https://github.com/mvdan/gofumpt#vim-go"},"vim"),",\n",(0,o.kt)("a",{parentName:"p",href:"https://github.com/mvdan/gofumpt#goland"},"golang"),", or\n",(0,o.kt)("a",{parentName:"p",href:"https://github.com/mvdan/gofumpt#visual-studio-code"},"vscode"),", there exists a way to set your editor to format\nusing ",(0,o.kt)("inlineCode",{parentName:"p"},"gofumpt"),", see the links for more details."))}l.isMDXComponent=!0}}]);