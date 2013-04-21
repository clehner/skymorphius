SkyMorphius
===========

A nice API for [SkyMorph](http://skyview.gsfc.nasa.gov/skymorph/).

API
---

* `/observations`

### Search for observations by target name

Parameters:

* **target**: name of object to search for
* **service**: which archive to search

#### Services

* **NEAT**: 1996-2006. *has triplet images*
* **Spacewatch**: 2003-2008. *has images*
* **DSS**: 1948-1956, 1972-1988. *has images*
* **DSS2**: 1984-1997. *has images*
* **HST**: 1990-present
* **USNO** 1978-1999
* **POSSI**: 1948-1956

### Search for observations by orbital elements

Parameters:

* **epoch**: Epoch ([M]JD or ISO)
* **eccentricity**: Eccentricity
* **per_distance**: Perihelion Distance (AU)
* **per_date**: Perihelion Date ([M]JD or ISO)
* **long_asc_node**: Long. Asc. Node (Degrees)
* **arg_of_per**: Arg. of Perihelion (Degrees)
* **inclination**: Inclination (Degrees)
* **h_magnitude**: H magnitude


Example: `GET /observations?target=Hale-Bopp&service=NEAT`

Response:
```js
{
  "error": null,
  "observations": [
    {
      "image_id": "|960324132026|50166.5559722222|295.128380907151|-20.1562874986635|295.23915|-20.16389|10.70|11.93|10.46|0.09|0.06|15.67|1278.32030183787|997.86482820866|y|",
      "id": "960324132026", // observation id
      "has_triplet": true, // is there a triplet image
      "time": "1996-03-24 13:20:36", // UTC
      "predicted_position": [
        [19, 40, 30.81], // right ascension
        [-20, 9, 22.6] // declination
      ],
      "observation_center": [
        [19, 40, 57.4], // right ascension
        [-20, 9, 50] // declination
      ],
      "magnitude": 10.7,
      "velocity": [11.93, 10.46], // W-E, S-N (degrees per hour)
      "offset": 6.26, // minutes
      "positional_error": [0.09, 0.06, 15.67], // major, minor, position angle
      "pixel_location": [1278.32, 997.86] // X, Y
    },
    ...
  ]
}
```

