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

How you choose to collect the data and process it is up to you. In my case I looped over a list of known gyms, ex-raid location/dates, and used [d3-geo.js](https://github.com/d3/d3-geo) to allocate various properties to each gym.

Since this site so far has been for my personal use, I have not published the relevant scripts yet. When I make it more user-friendly I will include it here.

Below is an example of one such gym. In geoJSON terminology, it is simply a `Point` `Feature` with 1 set of coordinates.

- `all.geojson`
    ```
        {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [
                            103.863283,                 // Longitude
                            1.3002109999999998          // Latitude
                        ]
                    },
                    "properties": {
                        "name": "Nicoll Highway MRT ",  // Gym name
                        "terrains": [
                            "2016-08-01",               // Whether this gym was 
                            "2017-01-01",               // in a park at a certain 
                            "2017-08-01"                // backdated OSM query
                        ],                              // If empty, then it was never in a park.
                        "dates": [
                            "2018-01-09",               // The EX-raid dates
                            "2017-12-18",               // If empty, then it never had an EX-raid.
                            "2017-11-26",
                            "2017-11-11"
                        ],
                        "s2Cell": "J11"                 // The S2 Cell. See below for details
                    }
                },
            ],
            ...                                         // Subsequent gyms
        }
    ```

### S2 Grid
Plotting an S2 grid is quite straightforward thanks to this [widespread tool](https://s2.sidewalklabs.com/regioncoverer). Using it programmatically however, is what I'm going to cover.

Again, we're going to work with a geoJSON format. Unfortunately unlike **d3-geo.js**, there is no properly documentated javascript library for S2. The closest that comes to it is [node-s2](https://github.com/mapbox/node-s2), but I will detail the steps to get it working elsewhere.

At the heart of it though, S2 cells are rectangular polygons in geoJSON which means they are a `Feature` with 5 coordinates, for each point of the rectangular and the last point being a duplicate of the first to enclose the rectangle.

- `s2.geojson`
    ```
        {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [
                                103.613120349845,       // starting from bottom left 
                                1.4593379751768167
                            ],
                            [
                                103.63627151570851,     // to bottom right
                                1.459195119672904
                            ],
                            [
                                103.63627151570851,     // then to top right
                                1.4780115789917814
                            ],
                            [
                                103.613120349845,       // and top left
                                1.4781562750063957
                            ],
                            [
                                103.613120349845,       // and finishing back
                                1.4593379751768167      // at bottom left
                            ]
                        ]
                    ],
                    "properties": {
                        "order": "A1"                   // Assigned for easy reference
                    }
                },
                ...                                     // Subsequent cells
            ]
        }
    ```

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

**Please add an attribution link back to this repository if you are copying my site code.**
- It can be something as simple as a link called "Original version"
- Ideally it should be displayed at the bottom along with the attribution to Leaflet and OSM.

# Local development
Simply load `index.html` in your browser. A `file:///` URL works fine as long you are hosting the data sources elsewhere, otherwise Chrome doesn't allow network calls for the `file:///` scheme.
