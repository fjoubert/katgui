## KATGUI is the operator's User Interface for CAM in the MeerKAT project.

There's currently two(2) ways you can start developing/debugging/demoing KATGUI (both require a VPN connection if working remotely) either by installing the dependency packages on your system or developing within a docker container.

Both methods are explained below.

### 1. Via Local Installation
#### Installation

- Clone the repository.

```bash
git clone https://github.com/ska-sa/katgui
cd katgui
```

- Download and install [nodejs 10.x](http://nodejs.org/)

```bash
sudo apt-get install curl
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs
```

- Download and install [yarn](http://yarnpkg.com/)

```bash
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt-get update && sudo apt-get install yarn
```

- Install [gulp](https://gulpjs.com/) and ensure that `gulp` is in your path. e.g.`~/.yarn/bin/gulp`

```bash
yarn global add gulp@4.0.2
```

- Installing all the dependencies.

```bash
cd katgui
yarn install
```

### Usage

To use gulp to host the project locally on port 8000 run:

```bash
gulp webserver
```

**Note:** Running the webserver task will open a browser window to: `http://localhost:8000/localhostindex.html`.

The `localhostindex.html` file is created from the `index.html` file by the webserver task.
This is necessary in order to change the `<base href="/katgui/">` to `<base href="/">` for locally hosted instances of the GUI.
This allows us to run angularjs in 'HTML5' mode, which removes the hash from the URL. This means that when the `index.html` file is changed, the gulp webserver task needs to be stopped and started again to rebuild the `localhostindex.html` file.

#### Build dist files for deployment

To build the production version run:

```bash
gulp build
```

Which will minify and concat to the `dist/` folder.

After the production version has been built, make sure to commit and the new version to GitHub. This effectively creates a new release that is 'deployed' when pulling the KATGUI  project on the target CAM portal node.

## 2. Via Docker

For debugging/developing/demoing purposes run KATGUI in a [docker](https://www.docker.com/) container.

Ensure [docker-ce](https://docs.docker.com/engine/install/) and [docker-compose](https://docs.docker.com/compose/install/), alteratively follow the instructions below.

### Installation

Running `make` inside the directory will output useful function as shown below:

```bash
$ make
Please use `make <target>` where <target> is one of

bootstrap            - Installs docker, runs KATGUI webserver and opens KATGUI on google-chrome
build-new-image      - Pull the latest base-image and build docker image from local Dockerfile.
build-image          - Build docker image from local Dockerfile.
dist                 - Build dist files.
install-deps         - Check if docker exists, if not install them on host
run                  - Run KATGUI webserver
run-detached         - Run KATGUI webserver (Runs in background)
view-katgui          - Access the KATGUI via chrome-browser
stop                 - Stop KATGUI webserver
clean                - Remove all build, node_modules and docker containers.
clean-build          - Remove build artefacts.
clean-node-modules   - Remove node_modules artefacts.
lint                 - Check style with `eslint`
formatter            - Format style with ...
test                 - Run tests
```

### Usage

The command below checks and installs `docker` if it's missing, then builds `katgui` docker container before running it, and finally opens up KATGUI on google-chrome tab.

```bash
make bootstrap
```

Alternatively, 
If you do not have docker installed run:

```bash
make install
```

This should install docker automatically.

**Note:** This currently applies to Ubuntu/Debian users.


In order to use KATGUI for development/debugging/demo run:

```bash
make run
```

- Which will build and startup a container which exposes port 8000.
- Access the KATGUI: [http://localhost:8000/localhostindex.html](http://localhost:8000/localhostindex.html)

You should see the development KATGUI, enter your development box **URL, Username and Password**.

![image](https://user-images.githubusercontent.com/7910856/76946015-0f926d80-690c-11ea-8ee8-f977668712d2.png)

### Build dist files for deployment

To build the production version run:
```bash
make dist
```

Which will minify and concat to the `dist/` folder. Then you can commit and push.
