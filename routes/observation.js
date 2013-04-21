var request = require('request');
var fs = require('fs');

var obsRegex = /<td.*?Check_NEAT value='([^']*)'>\s*([\s\S]*?)<\/tr>/g;
var obsRegexInner = /([^<>]+)(?=<\/)/g;
var nbspRegex = /&nbsp;/g;

// convert strings for right ascension and declination into arrays of numbers
function ra_dec(ra, dec) {
  var ra = ra.split(' ').map(Number);
  var dec = dec.split(' ').map(Number);
  return [ra, dec];
}

/*
 * GET Observations of SkyMorph moving targets
 */
exports.by_target = function (req, res) {
  var target = req.params.target;

  // cache for development
  if (target == 'Ceres') request = function (_, cb) {
    cb(null, null, fs.readFileSync('/tmp/SkyMorph Moving Object Detection  Ceres.html'));
  }

  request({
    uri: 'http://skyview.gsfc.nasa.gov/cgi-bin/skymorph/mobssel.pl',
    qs: {
      NEAT: 'on',
      target: target
    }
  }, function (err, resp, body) {
    if (err) {
      res.send({error: err});
      return;
    }
    var observations = [];
    body = body.toString().replace(nbspRegex, ' ');

    // split the html table into individual observation rows
    var match;
    while (match = obsRegex.exec(body)) {
      var image_id = match[1];

      // get the fields in each row
      var fields = match[2].match(obsRegexInner);
      var ra = fields[3].split(' ').map(Number);
      var dec = fields[4].split(' ').map(Number);
      var observation = {
        image_id: image_id,
        id: fields[0],
        has_triplet: (fields[1] == 'y'),
        time: fields[2],
        predicted_position: ra_dec(fields[3], fields[4]),
        observation_center: ra_dec(fields[5], fields[6]),
        magnitude: Number(fields[7]),
        velocity: [Number(fields[8]), Number(fields[9])],
        offset: Number(fields[10]),
        positional_error: fields.slice(11, 14).map(Number),
        pixel_location: [Number(fields[14]), Number(fields[15])]
      };
      observations.push(observation);
    }

    res.send({error: null, observations: observations});
  });
};
