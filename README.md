# Strife CE Client

The Strife CE client consists of two parts. One part is an electron app, the other part is the angular website, which is shown in the app. This repository contains the content of the angular website. 
The electron app itself is rudimentary and there is o need for modifications. So the electron app itself is not available as a repository. Just install Strife CE from http://strife-ce.com to get the electron app.

## Contact and Help
If you have issues or questions regarding the code or the following "How to start"-Guide, reach out to strife-ce@devsheep.de or contact Pad at the Strife CE discord (https://discord.gg/a8SRUGk)

## How to contribute
You can't push to this repository directly. Feel free to fork this repository and create pull requests for your implementations.

## How to start

This is a NPM Project. You need to have Node.JS and a IDE like Visual Studio Code installed.

1. Fork the repository and clone your fork locally.
2. Initialize the submodule (src/app/data/common) from your cloned directory:

```bash
git submodule update --init
```
This submodule contains all datamodels, which are shared between Client and Master-Server

3. Execute in the directory of the cloned repository:

```bash
npm install
```

You can start the application now locally, connected against the productive remote master server (4. a) or against your locally driven master server (4. b)

4. a) Start connected to the productive master server
run the following command:

```bash
npm run start:prod
```

4. b) Start connected to the local master server
First you have to setup a local master server. You find the repository and howTo's here: https://github.com/strife-ce/strife-ce-master)
after setting up the project, run the following command in your client repository directory:

```bash
npm start
```

You can view the application in your browser (5. a) or via the electron app (5. b). In your browser not all features (like starting a game) are available but it is easier to work with.


5. a) Open the Strife CE Client in your browser

Open `localhost:4200` in your browser


5. b) Open the Strife CE Client in the electron app

If you have not already installed Strife CE, install it from http://strife-ce.com.
You will find the electron app in your installation path (Usually C:\Program files(X86)\Strife CE).
start the strife-ce.exe with the parameter -devmode

```bash
strife-ce.exe -devmode
```

It should start the app now with your locally running website.
