.ONESHELL:

SHELL := /bin/bash
DATE_ID := $(shell date +"%y.%m.%d")
# Get package name from pwd
PACKAGE_NAME := $(shell basename $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST)))))
DOCKER_IMAGE_NAME := katgui

.DEFAULT_GOAL := help

define BROWSER_PYSCRIPT
import webbrowser

try:
    browser = webbrowser.get(using='google-chrome')
except Exception:
    browser = webbrowser.get(using='chrome')
finally:
    browser.open("http://localhost:8000/localhostindex.html")
endef

define PRINT_HELP_PYSCRIPT
import re, sys
print("Please use `make <target>` where <target> is one of\n")
for line in sys.stdin:
	match = re.match(r'^([a-zA-Z_-]+):.*?## (.*)$$', line)
	if match:
		target, help = match.groups()
		if not target.startswith('--'):
			print(f"{target:20} - {help}")
endef

export BROWSER_PYSCRIPT
export PRINT_HELP_PYSCRIPT
# See: https://docs.python.org/3/using/cmdline.html#envvar-PYTHONWARNINGS
export PYTHONWARNINGS=ignore

PYTHON := python3

.SILENT: help
help:
	$(PYTHON) -c "$$PRINT_HELP_PYSCRIPT" < $(MAKEFILE_LIST)

# -------------------------------- Builds and Installations -----------------------------

.PHONY: bootstrap
bootstrap: install-deps build-image run-detached view-katgui  ## Installs docker, runs KATGUI webserver and opens KATGUI on google-chrome

build-new-image:  ## Pull the latest base-image and build docker image from local Dockerfile.
	docker build --pull -f ./Dockerfile -t $(DOCKER_IMAGE_NAME) .

build-image:  ## Build docker image from local Dockerfile.
	docker build -f ./Dockerfile -t $(DOCKER_IMAGE_NAME) .

dist:  ## Build dist files.
	docker run -ti --rm -v "${PWD}:/usr/src/app" $(DOCKER_IMAGE_NAME) gulp build
	ls -l dist

--check-os:
	if [ "$$(uname)" == "Darwin" ]; then \
		echo "Please follow instructions on how to install docker on mac"; \
		echo "Click: https://docs.docker.com/docker-for-mac/install/"; \
		exit 1; \
	elif [ "$$(expr substr $$(uname -s) 1 5)" == "Linux" ]; then \
		echo "Ensure you have sudo privileges, before you continue."; \
	fi; \

_install-docker:
	echo "Installing Docker..."
	curl -fsSL https://get.docker.com -o get-docker.sh
	bash -c "sudo bash get-docker.sh"
	rm -rf get-docker.sh

.SILENT: --check-os install
install-deps: --check-os  ## Check if docker exists, if not install them on host
	if [ ! -x "$$(command -v docker)" ]; then \
		$(MAKE) _install-docker
	else \
		echo "Docker is already installed."; \
	fi; \

# -------------------------------------- Project Execution -------------------------------
run:  ## Run KATGUI webserver
	docker run --name katgui-webserver \
	-ti --rm -p 8000:8000 \
	-v "${PWD}:/usr/src/app" $(DOCKER_IMAGE_NAME) gulp webserver

run-detached:  ## Run KATGUI webserver (Runs in background)
	docker run -d --name katgui-webserver \
	-ti --rm -p 8000:8000 \
	-v "${PWD}:/usr/src/app" $(DOCKER_IMAGE_NAME) gulp webserver

view-katgui:  ## Access the KATGUI via chrome-browser
	$(PYTHON) -c "$$BROWSER_PYSCRIPT"

stop:  ## Stop KATGUI webserver
	docker container kill katgui-webserver

jenkins-build:
	echo "## Updating mkatgui code from git ...";
	git remote update -p;
	git merge --ff-only origin/master;
	echo "## Installing npm packages ...";
	yarn install;
	echo "## Performing gulp build ...";
	gulp build;

# -------------------------------------- Clean Up  --------------------------------------
.PHONY: clean
clean: clean-build clean-node-modules clean-docker  ## Remove all build, node_modules and docker containers.

clean-build:  ## Remove build artefacts.
	rm -fr dist/

clean-node-modules:  ## Remove node_modules artefacts.
	rm -rf node_modules

# -------------------------------------- Code Style  -------------------------------------

lint:  ## Check style with `eslint`
	# TBD: https://eslint.org/docs/user-guide/getting-started
	$(nop)

formatter:  ## Format style with ...
	# TBD: https://www.npmjs.com/package/js-beautify
	$(nop)

# ---------------------------------------- Tests -----------------------------------------
test:  ## Run tests
	# TBD: https://gulpjs.com/docs/en/getting-started/creating-tasks
	$(nop)
