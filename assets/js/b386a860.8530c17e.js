"use strict";(self.webpackChunkjuno_docs=self.webpackChunkjuno_docs||[]).push([[5928],{1510:n=>{n.exports=JSON.parse('{"blogPosts":[{"id":"junopi","metadata":{"permalink":"/warp/blog/junopi","editUrl":"https://github.com/davidmitesh/warp/tree/main/docs/blog/2022-06-24-junopi/index.mdx","source":"@site/blog/2022-06-24-junopi/index.mdx","title":"Running Juno from your Raspberry Pi","description":"Juno is a node which aims to help decentralise StarkNet, a prominent Ethereum Layer 2.","date":"2022-06-24T00:00:00.000Z","formattedDate":"June 24, 2022","tags":[{"label":"juno","permalink":"/warp/blog/tags/juno"},{"label":"rpi","permalink":"/warp/blog/tags/rpi"},{"label":"raspberry","permalink":"/warp/blog/tags/raspberry"},{"label":"pi","permalink":"/warp/blog/tags/pi"},{"label":"deploy","permalink":"/warp/blog/tags/deploy"}],"readingTime":2.76,"truncated":false,"authors":[{"name":"Diego de Pablos","title":"Intern at Juno","url":"https://github.com/D-DePablos","imageURL":"https://github.com/D-DePablos.png","key":"depablos"},{"name":"Marcos Maceo","title":"Tech Lead of Juno","url":"https://github.com/stdevMac","imageURL":"https://github.com/stdevMac.png","key":"maceo"}],"frontMatter":{"slug":"junopi","title":"Running Juno from your Raspberry Pi","authors":["depablos","maceo"],"tags":["juno","rpi","raspberry","pi","deploy"]},"nextItem":{"title":"Welcome","permalink":"/warp/blog/welcome"}},"content":"Juno is a node which aims to help **decentralise StarkNet, a prominent Ethereum Layer 2**.\\n\\nFor its mission to be achieved, it needs people to **start running their own node**.\\n\\nTo become one of the early few making StarkNet better, read below.\\n\\n### Disclaimer\\n\\nIn this short article we lay out the steps to get a Raspberry PI with a working [Raspbian](https://www.raspbian.org/)\\ninstallation to run the Juno StarkNet node. We assume that you have access as a root user to the Pi.\\n\\nAt time of writing, **both StarkNet and Juno are still in an early release**. Expect this guide and required steps to change often!\\n\\nFor the latest on the project, check out our [Github repo](https://github.com/NethermindEth/juno), and refer to our\\n[Documentation](https://gojuno.xyz/).\\n\\nThe disk space issues are currently work in progress, and will be addressed in an upcoming new release.\\n\\n## Main Features\\n\\n- [Get and Sync state from Layer 1](https://gojuno.xyz/docs/features/sync) (Ethereum).\\n- [Get and Sync state from API](https://gojuno.xyz/docs/features/sync) (Feeder Gateway).\\n- Store [StarkNet State](https://gojuno.xyz/docs/features/sync) locally.\\n- Store StarkNet Transactions.\\n- Store StarkNet Blocks.\\n- Store the ABI of StarkNet contracts.\\n- Ethereum-like [Json RPC Server](https://gojuno.xyz/docs/features/rpc) following\\n  [this spec](https://github.com/starkware-libs/starknet-specs/blob/master/api/starknet_api_openrpc.json).\\n  in the same way you would call the feeder gateway, where using the same params will return the same response.\\n- [CLI](https://gojuno.xyz/docs/features/cli) for general StarkNet tools.\\n- [Metrics](https://gojuno.xyz/docs/features/metrics) using Prometheus.\\n\\n## Installation\\n\\n### Specification \ud83e\udd16\\n\\n    - Raspberry 4 (model B) - 4GB\\n    - MicroSD card - 16GB+ (Class 10 Minimum)\\n    - Power supply\\n    - Internet connection (ethernet preferrable)\\n    - USB keyboard, a monitor, and an HDMI cable to interact with the computer or .\\n\\n    - [Install Raspbian](https://www.raspbian.org/)\\n    - [Install Golang (see below)](https://golang.org/doc/install)\\n    - [Have make installed](https://golang.org/doc/install#make)\\n\\n### Get Golang \ud83e\uddab\\n\\nEnsure that your Raspberry Pi is up-to-date.\\n\\n```bash\\nsudo apt update\\nsudo apt full-upgrade\\n```\\n\\nCheck the [Golang download website](https://go.dev/dl/) for the latest armv6l version. At time of writing, we would download go 1.18.3.\\n\\n```bash\\nwget https://go.dev/dl/go1.18.3.linux-armv6l.tar.gz -O go.tar.gz\\n```\\n\\nNow extract the tarball into your /usr/local/ directory (root access required).\\n\\n```bash\\nsudo tar -C /usr/local -xzf go.tar.gz\\n```\\n\\nAdd the following to your shell config (usually ~/.bashrc).\\nIf you have no preferred text editor, you can use `nano ~/.bashrc` to edit your bash config from the terminal.\\n\\n```bash\\n# ~/.bashrc\\nexport GOPATH=$HOME/go\\nexport PATH=/usr/local/go/bin:$PATH:$GOPATH/bin\\n```\\n\\nAfterwards press `CTRL` + `X` and then `Y` to exit the nano text editor and save the file.\\n\\nFinally, as your `.bashrc` is only initialised when the shell is started, you need to source the new `~/.bashrc` to update available commands.\\n\\n```bash\\nsource ~/.bashrc\\n```\\n\\nYou should now have a working Golang installation in your Raspberry Pi. You can check it typing:\\n\\n```bash\\ngo version\\n```\\n\\n### Install Juno \u2699\ufe0f\\n\\nTo install `juno`, the StarkNet node:\\n\\n```bash\\ngo install github.com/NethermindEth/juno/cmd/juno@latest\\n```\\n\\nTo install `juno-cli`, the separate tool for interacting with StarkNet:\\n\\n```bash\\ngo install github.com/NethermindEth/juno/cmd/juno-cli@latest\\n```\\n\\nFor details about the configuration you can look at\\nthe [config file description](https://gojuno.xyz/docs/running/config).\\n\\n## Configuring juno\\n\\nUsually, when you first run Juno, a [config file](https://gojuno.xyz/docs/running/config) will be created in\\n`/home/pi/.config/juno/juno.yaml` in your home directory.\\n\\nWhen syncing the StarkNet state from a Raspberry Pi, we expect you to have at least 64GB. In case of you don\'t have\\nthis space, you can run it using an SSD, ensuring that the property `db_path` points to the external SSD:\\n\\n```yaml\\n# juno.yaml\\ndb_path: /path/to/ssd/database/here\\n```"},{"id":"welcome","metadata":{"permalink":"/warp/blog/welcome","editUrl":"https://github.com/davidmitesh/warp/tree/main/docs/blog/2022-06-17-welcome/index.md","source":"@site/blog/2022-06-17-welcome/index.md","title":"Welcome","description":"Juno is a Go implementation of a StarkNet full node client made with \u2764\ufe0f by Nethermind.","date":"2022-06-17T00:00:00.000Z","formattedDate":"June 17, 2022","tags":[{"label":"hello","permalink":"/warp/blog/tags/hello"},{"label":"juno","permalink":"/warp/blog/tags/juno"}],"readingTime":0.89,"truncated":false,"authors":[{"name":"Marcos Maceo","title":"Tech Lead of Juno","url":"https://github.com/stdevMac","imageURL":"https://github.com/stdevMac.png","key":"maceo"}],"frontMatter":{"slug":"welcome","title":"Welcome","authors":["maceo"],"tags":["hello","juno"]},"prevItem":{"title":"Running Juno from your Raspberry Pi","permalink":"/warp/blog/junopi"}},"content":"Juno is a Go implementation of a StarkNet full node client made with \u2764\ufe0f by Nethermind.\\n\\nWe are working hard for our first release, until then, what you can do?\\n\\nLet\'s discover **Juno in less than 5 min**.\\n\\n## What You Will Need\\n\\n- [Golang](https://go.dev/doc/install) version 1.18 for build and run the project.\\n- _For Linux_: You will need to install `clang`:\\n\\n```shell\\nsudo apt -y install clang\\n```\\n\\n### Installing\\n\\nAfter cloning the project,\\n\\n```bash\\ngit clone https://github.com/NethermindEth/juno\\n```\\n\\nYou can install all the dependencies running the following command inside the project folder:\\n\\n```bash\\n$ go get ./...\\n```\\n\\n## Running Juno\\n\\n### Compiling Directly\\n\\nCompile Juno:\\n\\n```bash\\n$ make compile\\n```\\n\\nAfter compilation, you will have 2 commands inside the `build` folder:\\n\\n- juno\\n  - `juno` is the command that initializes the node.\\n- juno-cli\\n  - `juno-cli` is the command that direct interactions with the StarkNet ecosystem.\\n\\n```bash\\n$ make run\\n```\\n\\nFor more details on the configuration, check the [config description](https://gojuno.xyz/docs/running/config).\\n\\n### Using Docker\\n\\nIf you prefer to use docker, you can follow [this](https://gojuno.xyz/docs/running/docker) guide."}]}')}}]);