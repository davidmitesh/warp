"use strict";(self.webpackChunkjuno_docs=self.webpackChunkjuno_docs||[]).push([[1512],{3905:(e,t,n)=>{n.d(t,{Zo:()=>p,kt:()=>d});var l=n(7294);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);t&&(l=l.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,l)}return n}function a(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function i(e,t){if(null==e)return{};var n,l,r=function(e,t){if(null==e)return{};var n,l,r={},o=Object.keys(e);for(l=0;l<o.length;l++)n=o[l],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(l=0;l<o.length;l++)n=o[l],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var u=l.createContext({}),c=function(e){var t=l.useContext(u),n=t;return e&&(n="function"==typeof e?e(t):a(a({},t),e)),n},p=function(e){var t=c(e.components);return l.createElement(u.Provider,{value:t},e.children)},s={inlineCode:"code",wrapper:function(e){var t=e.children;return l.createElement(l.Fragment,{},t)}},m=l.forwardRef((function(e,t){var n=e.components,r=e.mdxType,o=e.originalType,u=e.parentName,p=i(e,["components","mdxType","originalType","parentName"]),m=c(n),d=r,g=m["".concat(u,".").concat(d)]||m[d]||s[d]||o;return n?l.createElement(g,a(a({ref:t},p),{},{components:n})):l.createElement(g,a({ref:t},p))}));function d(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var o=n.length,a=new Array(o);a[0]=m;var i={};for(var u in t)hasOwnProperty.call(t,u)&&(i[u]=t[u]);i.originalType=e,i.mdxType="string"==typeof e?e:r,a[1]=i;for(var c=2;c<o;c++)a[c]=n[c];return l.createElement.apply(null,a)}return l.createElement.apply(null,n)}m.displayName="MDXCreateElement"},6708:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>u,contentTitle:()=>a,default:()=>s,frontMatter:()=>o,metadata:()=>i,toc:()=>c});var l=n(7462),r=(n(7294),n(3905));const o={slug:"welcome",title:"Welcome",authors:["maceo"],tags:["hello","juno"]},a=void 0,i={permalink:"/warp/blog/welcome",editUrl:"https://github.com/davidmitesh/warp/tree/main/docs/blog/2022-06-17-welcome/index.md",source:"@site/blog/2022-06-17-welcome/index.md",title:"Welcome",description:"Juno is a Go implementation of a StarkNet full node client made with \u2764\ufe0f by Nethermind.",date:"2022-06-17T00:00:00.000Z",formattedDate:"June 17, 2022",tags:[{label:"hello",permalink:"/warp/blog/tags/hello"},{label:"juno",permalink:"/warp/blog/tags/juno"}],readingTime:.89,truncated:!1,authors:[{name:"Marcos Maceo",title:"Tech Lead of Juno",url:"https://github.com/stdevMac",imageURL:"https://github.com/stdevMac.png",key:"maceo"}],frontMatter:{slug:"welcome",title:"Welcome",authors:["maceo"],tags:["hello","juno"]},prevItem:{title:"Running Juno from your Raspberry Pi",permalink:"/warp/blog/junopi"}},u={authorsImageUrls:[void 0]},c=[{value:"What You Will Need",id:"what-you-will-need",children:[{value:"Installing",id:"installing",children:[],level:3}],level:2},{value:"Running Juno",id:"running-juno",children:[{value:"Compiling Directly",id:"compiling-directly",children:[],level:3},{value:"Using Docker",id:"using-docker",children:[],level:3}],level:2}],p={toc:c};function s(e){let{components:t,...n}=e;return(0,r.kt)("wrapper",(0,l.Z)({},p,n,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("p",null,"Juno is a Go implementation of a StarkNet full node client made with \u2764\ufe0f by Nethermind."),(0,r.kt)("p",null,"We are working hard for our first release, until then, what you can do?"),(0,r.kt)("p",null,"Let's discover ",(0,r.kt)("strong",{parentName:"p"},"Juno in less than 5 min"),"."),(0,r.kt)("h2",{id:"what-you-will-need"},"What You Will Need"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"https://go.dev/doc/install"},"Golang")," version 1.18 for build and run the project."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("em",{parentName:"li"},"For Linux"),": You will need to install ",(0,r.kt)("inlineCode",{parentName:"li"},"clang"),":")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-shell"},"sudo apt -y install clang\n")),(0,r.kt)("h3",{id:"installing"},"Installing"),(0,r.kt)("p",null,"After cloning the project,"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-bash"},"git clone https://github.com/NethermindEth/juno\n")),(0,r.kt)("p",null,"You can install all the dependencies running the following command inside the project folder:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-bash"},"$ go get ./...\n")),(0,r.kt)("h2",{id:"running-juno"},"Running Juno"),(0,r.kt)("h3",{id:"compiling-directly"},"Compiling Directly"),(0,r.kt)("p",null,"Compile Juno:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-bash"},"$ make compile\n")),(0,r.kt)("p",null,"After compilation, you will have 2 commands inside the ",(0,r.kt)("inlineCode",{parentName:"p"},"build")," folder:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"juno",(0,r.kt)("ul",{parentName:"li"},(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"juno")," is the command that initializes the node."))),(0,r.kt)("li",{parentName:"ul"},"juno-cli",(0,r.kt)("ul",{parentName:"li"},(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"juno-cli")," is the command that direct interactions with the StarkNet ecosystem.")))),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-bash"},"$ make run\n")),(0,r.kt)("p",null,"For more details on the configuration, check the ",(0,r.kt)("a",{parentName:"p",href:"https://gojuno.xyz/docs/running/config"},"config description"),"."),(0,r.kt)("h3",{id:"using-docker"},"Using Docker"),(0,r.kt)("p",null,"If you prefer to use docker, you can follow ",(0,r.kt)("a",{parentName:"p",href:"https://gojuno.xyz/docs/running/docker"},"this")," guide."))}s.isMDXComponent=!0}}]);