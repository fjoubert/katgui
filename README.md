katgui is the Operator user interface for CAM in the MeerKAT project.

After cloning the repo do:

- Download and install http://nodejs.org/
- Download and install http://yarnpkg.com/
You could be lucky by trying the following:
>sudo apt-get install curl
>curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
>sudo apt-get install -y nodejs

>curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
>echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
>sudo apt-get update && sudo apt-get install yarn

Navigate to the project folder
>yarn install

To isntall all packages in package.json
>npm install

To use gulp to host the project locally on port 8000 do:
>gulp webserver

(If needed install the gulp task runner globally using `sudo npm install -g gulp`)

Note: that running the webserver task will open a browser window to `http://localhost:8000/localhostindex.html`.
The `localhostindex.html` file is created from the `index.html` file by the webserver task. This is necessary
in order to change the `<base href="/katgui/">` to `<base href="/">` for locally hosted instances of the gui.
This allows us to run angularjs in 'HTML5' mode, which removes the hash from the url. This means that when the
index.html file is changed, the gulp webserver task needs to be stopped and started again to rebuild the
`localhostindex.html` file.

To build the production version do:
>gulp build

Which will minify and concat to the dist/ folder.

After the production version has been built, make sure to commit and the new version to github. This effectively
creates a new release that is 'deployed' when pulling the katgui project on the target CAM portal node.
