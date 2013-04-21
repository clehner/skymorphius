
/*
 * GET home page.
 */

exports.index = function (req, res) {
  res.render('index', {
    title: 'SkyMorphius',
    sample_targets: ['Hale-Bopp', 'Ceres', 'Andromeda']
  });
};
