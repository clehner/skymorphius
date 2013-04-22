SkyMorphius
===========

A nice API for [SkyMorph](http://skyview.gsfc.nasa.gov/skymorph/).

Made for the
[International](http://spaceappschallenge.org/)
[SpaceApps](http://spaceappschallenge.org/project/skymorphius/)
[Challenge](http://spaceappschallenge.org/challenge/skymorph-imagery-api/).

API
---

* `/observations`

### Search for observations by target name

#### Parameters

* **target**: name of object to search for
* **service**: which archive to search

##### Services

* **NEAT**: 1996-2006. *has triplet images*
* **Spacewatch**: 2003-2008. *has images*
* **DSS**: 1948-1956, 1972-1988. *has images*
* **DSS2**: 1984-1997. *has images*
* **HST**: 1990-present
* **USNO** 1978-1999
* **POSSI**: 1948-1956

### Search for observations by orbital elements

#### Parameters

* **epoch**: Epoch ([M]JD or ISO)
* **eccentricity**: Eccentricity
* **per_distance**: Perihelion Distance (AU)
* **per_date**: Perihelion Date ([M]JD or ISO)
* **long_asc_node**: Long. Asc. Node (Degrees)
* **arg_of_per**: Arg. of Perihelion (Degrees)
* **inclination**: Inclination (Degrees)
* **h_magnitude**: H magnitude


Example: [`GET /observations?target=Hale-Bopp&service=NEAT`]
(http://skymorphius.tk/observations?target=Hale-Bopp&service=NEAT)

Response:
```js
{
  "error": null,
  "observations": [
    {
      "service": "NEAT", // Near Earth Asteroid Tracking
      "id": "960324132026", // observation id
      "has_triplet": true, // is there a triplet image
      "time": "1996-03-24 13:20:36", // UTC
      "predicted_position": [
        19.675225, // right ascension
        -20.156277777777778 // declination
      ],
      "observation_center": [
        19.68261111111111, // right ascension
        -20.163888888888888 // declination
      ],
      "h_magnitude": 10.7,
      "velocity": [11.93, 10.46], // W-E, S-N (degrees per hour)
      "offset": 6.26, // minutes
      "positional_error": [0.09, 0.06, 15.67], // major, minor, position angle
      "pixel_location": [1278.32, 997.86] // X, Y
      "type": "observation",
      "names": [
        "Hale-Bopp"
      ],
      "image": "/observations/960324132026/image"
    },
    ...
  ]
}
```

## Installation

### Requirements

- Node.js
- CouchDB

### Procedure

- Copy `routes/couchconfig.example.json` to `routes/couchconfig.json`
- Edit `routes/couchconfig.json`: add the address for your CouchDB database.
- In CouchDB's Futon, create a database for skymorphius.
- Deploy the database design document using the `erica` couchapp tool:

```bash
cd couch
erice push . https://example.org:6984/db_name
```

- Install and start the web server.

```bash
npm install
npm start
```

- [Visit the site](http://localhost:3000/)
