<p align="center">
   <a href="http://jblaha.art"><img src="https://i.imgur.com/VM9yu68.png"></a>
   <br>
   Play it <a href="http://jblaha.art">here</a>!
   <br><br>
   <a href="https://www.npmjs.com/package/sketchbook"><img src="https://img.shields.io/npm/v/sketchbook?style=flat-square"></a>
   <a href="https://travis-ci.org/swift502/Sketchbook"><img src="https://img.shields.io/travis/swift502/sketchbook?style=flat-square"></a>
</p>

# :ledger: Sketchbook

Simple web based game engine built on [three.js](https://github.com/mrdoob/three.js) and [cannon.js](https://github.com/schteppe/cannon.js) focused on third-person character controls and related gameplay mechanics.

Mostly a playground for exploring how conventional third person gameplay mechanics found in modern games work and recreating them in a general way.


## Features

* World
    * Three.js scene
    * Cannon.js physics
    * Variable timescale
    * Frame skipping
    * FXAA anti-aliasing
* Characters
    * Third-person camera
    * Raycast character controller with capsule collisions
    * General state system
    * Character AI

#### Not yet implemented

* Vehicles
    * Cars
    * Airplanes
    * Helicopters

All planned features can be found in the [GitHub Projects](https://github.com/swift502/Sketchbook/projects).

## Installation

Use NPM:
```shell
npm install sketchbook --save
```
```js
import * as Sketchbook from 'sketchbook'
```

Or download the [latest release](https://github.com/swift502/Sketchbook/releases) and import via the script tag:
```html
<script src="sketchbook.min.js"></script>
```

<!-- ## Usage

This snippet turns a blank page into a playable character demo.

```js
const world = new Sketchbook.World();
world.loadBasicLevel();

let player = new Sketchbook.Character();
world.add(player);
player.takeControl();
``` -->

To learn specifics about using Sketchbook, check out the [examples](https://github.com/swift502/Sketchbook/tree/master/examples).

## Contributing

I appreciate all help, be it suggestions, issues or even pull requests.

1. Clone the repository
3. Run `npm install`
4. Contribute!

Use the npm scripts defined in `package.json`:
* `npm run dev` - start a local server, build in dev mode and watch changes
* `npm run build` - build in production mode and generate type decleration files

