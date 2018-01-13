# Pokemon Go EX-raid Map for Singapore

Originally this project started out as a simple map to identify gyms in park. Over time it grew to be a useful collection of data points as well as for analysis. Therefore I am adapting this into a more general purpose mapping site that can be easily extended to other areas.

# Installation Requirements
- A static site host (like Github Pages)
- A tile server (This site makes use of the OSM's generously provided servers)
- A data source in the same format as `all.geojson` hosted somewhere (I use [Github Gists](https://gist.github.com) and [Rawgit](https://rawgit.com))

# Data sources
The data sources are in the geoJSON format as it allows for:
- easy parsing by javascript
- being human-readable (in the case of manually updating EX-raids) 
- easily extensible (The `properties` key)

### Gym list
The rationale behind this data format is to front-load expensive geographical calculations beforehand, so that the map, its markers and overlays can be (re-)rendered and filtered as quickly as possible for a seamless user experience.

- `all.geojson`
- Generated from https://github.com/xiankai/pokemongo-tools

### S2 Grid
Plotting an S2 grid is quite straightforward thanks to this [widespread tool](https://s2.sidewalklabs.com/regioncoverer). Using it programmatically however, is what I'm going to cover.

- `s2.geojson`
- Generated from https://github.com/xiankai/pokemongo-tools

# Building from source
There is not much to change. There are chiefly 3 files of concern:
- `index.html`
    - Change the title tag
    - I use Sentry/Raven for error-reporting. You can reconfigure it or just remove it.
    - I use google analytics to monitor my site load. Again, reconfigure or remove.
    - What follows is a bunch of libraries that simply make the site a bit nicer and easier to code in.
    - The HTML and CSS are barebones as it is. Again, you can customize as you see fit.
- `index.js`
    - Although I cram everything into one file, it is not a lot of code. It is mostly filters and plugging in Leaflet libraries.
    - What is important is to change the 2 calls of `fetchLocal` to use your own data sources for `all.geojson` and `s2.geojson` respectively. I used the function back when I was doing fine without jQuery. Now you can just replace with it `$.get` I guess. I don't use fetch as I prefer not to have to polyfill it for older browsers.
    - You can also change the tile servers used here. If you host your own one, It should be fast and speedier to load for local users.
- `compiled.js`
    - This is the babelified version of `index.js`, for browser compatibility. 
    - First run `yarn` to install required packages (also for linting and code formatting)
    - Run `yarn build`, which also starts in watch mode and changes `compiled.js` as you edit `index.js`.

**Please add an attribution link back to this repository if you are copying my site code, so people can contact me about my code if needed.**
- Example attribution:
    - ```<a href="https://github.com/xiankai/sg-pokemongo-ex-raid-map">Original source</a>```
- Ideally it should be displayed at the bottom along with the attribution to Leaflet and OSM.

# Local development
Simply load `index.html` in your browser. A `file:///` URL works fine as long you are hosting the data sources elsewhere, otherwise Chrome doesn't allow network calls for the `file:///` scheme.
