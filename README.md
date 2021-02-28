# ncs-analyzer

graphical interactive linear interpolation function generator

this is an early version. in the [demo](https://milahu.github.io/ncs-analyzer/) you can

* pan and zoom the graph
* move the orange points to fit the interpolation function to the data scatterplot
* change the `xDomain` between hue, chromaticness and blackness
* change blackness and chromaticness
* toggle normalization

sample data: Natural Color System (NCS) compared to RGB HSL HSV color systems

goal: find a piecewise linear approximation of the `ncs2rgb` and `rgb2ncs` function

this seems to be the first attempt to find a `rgb2ncs` function ...

the function should be optimized for time (performance) at the cost of size.
for this, we use only linear interpolation (not quadratic or cubic)
and we limit the X values to a grid
so we can find the segment by its index `(X / gridSize)|0`
and we can avoid binary search

based on [svelte](https://github.com/sveltejs/svelte) and [layercake](https://github.com/mhkeller/layercake-template)

## Get started

Install the dependencies...

```bash
npm install
npm run build && npm start
```

Your app will be running at [localhost:5000](http://localhost:5000).

## Developing

```sh
# if you didn't already install, run the install command
npm install
npm run dev
```

Your app will be running at [localhost:5000](http://localhost:5000).

## Server-side rendering

This template also lets you pre-render your project, which will build out the elements that don't rely on any client-side JavaScript.

```sh
npm run build:ssr
npm start
```

Your app will be running at [localhost:5000](http://localhost:5000).

#### Hydrating

Sometimes you want to build out the HTML but your graphic still relies on some client-side JavaScript. In these cases, set `hydrate: true` in the `config.json` file. That will set the `hydratable` [compiler option](https://svelte.dev/docs#svelte_compile) and the `hydrate` [runtime option](https://svelte.dev/docs#Creating_a_component) to `true`. It will also add a script tag to load the `build/bundle.js` JavaScript file.

## Additional info

This is a fairly basic setup that has just enough to get you going with LayerCake and SSR rendering. For a more complete Svelte setup, take a look at Russell Goldenberg's [svelte-starter](https://github.com/russellgoldenberg/svelte-starter).
