"use strict";(self.webpackChunkjuno_docs=self.webpackChunkjuno_docs||[]).push([[1634],{3905:(e,t,n)=>{n.d(t,{Zo:()=>c,kt:()=>m});var r=n(7294);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},o=Object.keys(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var s=r.createContext({}),u=function(e){var t=r.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},c=function(e){var t=u(e.components);return r.createElement(s.Provider,{value:t},e.children)},d={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},p=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,o=e.originalType,s=e.parentName,c=l(e,["components","mdxType","originalType","parentName"]),p=u(n),m=a,h=p["".concat(s,".").concat(m)]||p[m]||d[m]||o;return n?r.createElement(h,i(i({ref:t},c),{},{components:n})):r.createElement(h,i({ref:t},c))}));function m(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var o=n.length,i=new Array(o);i[0]=p;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l.mdxType="string"==typeof e?e:a,i[1]=l;for(var u=2;u<o;u++)i[u]=n[u];return r.createElement.apply(null,i)}return r.createElement.apply(null,n)}p.displayName="MDXCreateElement"},7944:(e,t,n)=>{n.r(t),n.d(t,{contentTitle:()=>i,default:()=>c,frontMatter:()=>o,metadata:()=>l,toc:()=>s});var r=n(7462),a=(n(7294),n(3905));const o={title:"Juno Docs Contributor Guide"},i=void 0,l={unversionedId:"contribution_guidelines/contribution-guide",id:"contribution_guidelines/contribution-guide",title:"Juno Docs Contributor Guide",description:"Thank you for your interest in adding to our docs!",source:"@site/docs/contribution_guidelines/contribution-guide.mdx",sourceDirName:"contribution_guidelines",slug:"/contribution_guidelines/contribution-guide",permalink:"/warp/docs/contribution_guidelines/contribution-guide",editUrl:"https://github.com/davidmitesh/warp/tree/main/docs/docs/contribution_guidelines/contribution-guide.mdx",tags:[],version:"current",frontMatter:{title:"Juno Docs Contributor Guide"},sidebar:"tutorialSidebar",previous:{title:"Docs Cheatsheet",permalink:"/warp/docs/contribution_guidelines/cheatsheet"},next:{title:"Development Lifecycle",permalink:"/warp/docs/contribution_guidelines/development-lifecycle"}},s=[{value:"Repo structure",id:"repo-structure",children:[],level:2},{value:"Cheatsheet",id:"cheatsheet",children:[],level:2},{value:"Contribution steps:",id:"contribution-steps",children:[],level:2},{value:"Docusaurus-specific considerations",id:"docusaurus-specific-considerations",children:[{value:"Adding meta data to your doc",id:"adding-meta-data-to-your-doc",children:[],level:3},{value:"Side bar navigation",id:"side-bar-navigation",children:[],level:3}],level:2}],u={toc:s};function c(e){let{components:t,...n}=e;return(0,a.kt)("wrapper",(0,r.Z)({},u,n,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("p",null,"Thank you for your interest in adding to our docs!"),(0,a.kt)("h2",{id:"repo-structure"},"Repo structure"),(0,a.kt)("p",null,"The docs repository is structured intuitively with the staging branch as the default branch. Once you click on docs ",(0,a.kt)("a",{parentName:"p",href:"https://github.com/NethermindEth/juno/docs/tree/staging/docs"},"(docs/docs)"),", you access a collection of .mds documents organized in folders the same way they are organized in the sidebar of the docs website."),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},"All the pages on Docusaurus are created from these mdx"),(0,a.kt)("li",{parentName:"ul"},"the docusaurus sidebar is created from the ",(0,a.kt)("a",{parentName:"li",href:"https://github.com/NethermindEth/juno/blob/main/docs/sidebars.js"},"sidebar.js")," file")),(0,a.kt)("h2",{id:"cheatsheet"},"Cheatsheet"),(0,a.kt)("p",null,"We've created a simple cheatsheet file with examples of every heading, code block & tab component you can use to create your doc entry."),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"cheatsheet"},"Click here to see the reference doc")),(0,a.kt)("h2",{id:"contribution-steps"},"Contribution steps:"),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},"Step 1:")," Create a branch off of the staging branch"),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},"Step 2:")," Add desired changes to your branch"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},"you can use yarn to visualize your edits locally using ",(0,a.kt)("inlineCode",{parentName:"li"},"yarn start"))),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},"Step 3:")," Make a PR to the main branch"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},"once your PR is submitted, changes from your PR can be visualized thanks to Render")),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},"Step 4:")," Changes to staging branch (PRs) are reviewed and merged by ",(0,a.kt)("em",{parentName:"p"},"docs")," admins"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},"after review, PRs are merged to the main branch and your changes are now deployed live to the ",(0,a.kt)("a",{parentName:"li",href:"https://gojunoxyz/"},"docs website"))),(0,a.kt)("h2",{id:"docusaurus-specific-considerations"},"Docusaurus-specific considerations"),(0,a.kt)("p",null,"There's a couple things to be aware of when adding your own ",(0,a.kt)("inlineCode",{parentName:"p"},"*.md")," files to our codebase:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},"Please remove all ",(0,a.kt)("inlineCode",{parentName:"li"},"HTML")," elements"),(0,a.kt)("li",{parentName:"ul"},"Links are done using ",(0,a.kt)("inlineCode",{parentName:"li"},"[text](link)"),". These can be used to link to external websites, or to local files"),(0,a.kt)("li",{parentName:"ul"},"For images, use the syntax ",(0,a.kt)("inlineCode",{parentName:"li"},"![Alt Text](image url)")," to add an image. For an acceptable alternative syntax see below:")),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-md"},"<img\nsrc={require('../static/img/example-banner.png').default}\nalt=\"Example banner\"\n/>\n")),(0,a.kt)("h3",{id:"adding-meta-data-to-your-doc"},"Adding meta data to your doc"),(0,a.kt)("p",null,"The docs make use of a feature called ",(0,a.kt)("a",{parentName:"p",href:"https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-content-docs#markdown-frontmatter"},"frontmatter")," which allows for the addition of some meta data and\ncontrols the way docs are referenced through the site."),(0,a.kt)("p",null,"To correctly use it, add a small section at the top of your doc, such as:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-md"},"---\ntitle: Example Doc\n---\n")),(0,a.kt)("p",null,"That title in the example will automatically add a ",(0,a.kt)("inlineCode",{parentName:"p"},"# Heading")," to your page when it renders"),(0,a.kt)("p",null,"There are a couple settings available;"),(0,a.kt)("p",null,"Such as specifying the url you would like using"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"slug: /questionably/deep/url/for/no/reason/buckwheat-crepes")),(0,a.kt)("p",null,"Adding ",(0,a.kt)("inlineCode",{parentName:"p"},"keywords")," or ",(0,a.kt)("inlineCode",{parentName:"p"},"description")," etc, as required. Full example:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre"},"---\nid: not-three-cats\ntitle: Three Cats\nhide_title: false\nhide_table_of_contents: false\nsidebar_label: Still not three cats\ncustom_edit_url: https://github.com/NethermindEth/juno/docs/edit/main/docs/three-cats.md\ndescription: Three cats are not unlike four cats like three cats\nkeywords:\n  - cats\n  - three\nimage: ./assets/img/logo.png\nslug: /myDoc\n---\nMy Document Markdown content\n")),(0,a.kt)("h3",{id:"side-bar-navigation"},"Side bar navigation"),(0,a.kt)("p",null,"To update the high level navigation, open the file in ",(0,a.kt)("inlineCode",{parentName:"p"},"docs/sidebars.js")," and arrange n order as required. The titles for links are pulled from their files."),(0,a.kt)("p",null,"The ",(0,a.kt)("inlineCode",{parentName:"p"},"items")," here take a page ID, a page ID by default is the title of the file, as example ",(0,a.kt)("inlineCode",{parentName:"p"},"example-doc.md")," would be ",(0,a.kt)("inlineCode",{parentName:"p"},"example-doc"),"."),(0,a.kt)("p",null,"Find the Docusaurus documentation ",(0,a.kt)("a",{parentName:"p",href:"https://docusaurus.io/docs/sidebar"},"here"),"."))}c.isMDXComponent=!0}}]);