
/*
 * GET home page.
 */

exports.index = function (req, res) {
  res.render('index', {
    title: 'SkyMorphius',
    sample_targets: ['Hale-Bopp', 'Ceres', 'Pluto', 'Apophis'],
    orbital_params: [
      {
        name: 'Epoch',
        id: 'epoch',
        unit: '[M]JD or ISO'
      },
      {
        name: 'Eccentricity',
        id: 'eccentricity'
      },
      {
        name: 'Perihelion Distance',
        id: 'per_distance',
        unit: 'AU'
      },
      {
        name: 'Perihelion Date',
        id: 'per_data',
        unit: '[M]JD or ISO'
      },
      {
        name: 'Long. Asc. Node',
        id: 'long_asc_node',
        unit: 'Degrees'
      },
      {
        name: 'Arg. of Perihelion',
        id: 'arg_of_per',
        unit: 'Degrees'
      },
      {
        name: 'Inclination',
        id: 'inclination',
        unit: 'Degrees'
      },
      {
        name: 'H magnitude',
        id: 'h_magnitude'
      }
    ]
  });
};
