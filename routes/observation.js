var request = require('request');
var fs = require('fs');

var imageSize = 500;

var obsRegex = /<tr>\s*(?:<td.*?Check_[^ ]* value='([^']*)'>\s*)?([\s\S]*?)<\/tr>/g;
var obsRegexInner = /([^<>]+)(?=<\/td)/g;
var nbspRegex = /&nbsp;/g;
var badDateRegex = /([0-9]*):60$/;

// convert a DMS string into a decimal number
function dms_decimal(dms) {
  var nums = dms.split(' ').map(Number),
    d = nums[0],
    m = nums[1],
    s = nums[2],
    sign = d > 0 ? 1 : d < 0 ? -1 : 0;
  return sign * (d*sign + m/60 + s/3600);
}

function getImageInfo(key) {
  var params = {
    'Headers_NEAT': '|Observation|Time|ObjRA|ObjDec|Plt RA|Plt Dec|Magnitude|V_RA|V_Dec|E_Maj|E_Min|E_PosAng|x|y|',
    'Check_NEAT': key,
    'Npixel': imageSize,
    'Singlets': 'on',
    'Scaling': 'Log',
    'Extremum': 'Dft',
    'OverSize': 300,
    'OverScale': 0.5
  };
}

function getObservations(target, params, service, cb) {
  if (!service) {
    cb({error: 'service is required'});
    return;
  }

  // cache for development
  var req = request;
  if (target == 'Ceres') req = function (_, cb) {
    cb(null, null, fs.readFileSync('/tmp/SkyMorph Moving Object Detection  Ceres.html'));
  }
  if (target == 'Hale-Bopp') req = function (_, cb) {
    cb(null, null, fs.readFileSync('/tmp/Hale-Bopp.html'));
  }
  if (target == 'Pluto') req = function (_, cb) {
    cb(null, null, fs.readFileSync('/tmp/Pluto.html'));
  }

  // build the query
  var query;
  if (target) {
    query = {target: target};
  } else if (!params.epoch) {
    cb({error: 'missing target or orbital elements'});
    return;
  } else {
      query = {
        OE_EPOCH: params.epoch,
        OE_EC: params.eccentricity,
        OE_QR: params.per_dist,
        OE_TP: params.per_date,
        OE_OM: params.long_asc_node,
        OE_W: params.arg_of_per,
        OE_IN: params.inclination,
        OE_H: params.h_magnitude
      };
  }
  query[service] = 'on';

  req({
    uri: 'http://skyview.gsfc.nasa.gov/cgi-bin/skymorph/mobssel.pl',
    qs: query
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
      var imageId = match[1];

      // get the fields in each row
      var fields = match[2].match(obsRegexInner);

      var isNEAT = fields && fields[1] && fields[1].length < 4, hasTriplet;
      if (isNEAT) {
        // extract the has_triplet field,
        // which is only available for NEAT observations
        hasTriplet = fields.splice(1, 1)[1];
      }

      // fix almost-valid dates
      if (fields && fields[1] && badDateRegex.test(fields[1])) {
        fields[1] = fields[1].replace(badDateRegex, function (m) { return (+m[1]+1) + ':00'; });
      }

      // ignore nonmatching rows
      if (!fields || !fields[1] || isNaN(new Date(fields[1]))) {
        continue;
      }

      var positionalError = fields.slice(10, 13).map(Number);

      var observation = {
        _id: imageId,
        service: service,
        image: imageId ? "/images/" + imageId + ".jpg" : undefined,
        id: fields[0],
        has_triplet: hasTriplet,
        time: fields[1],
        predicted_position: [dms_decimal(fields[2]), dms_decimal(fields[3])],
        observation_center: [dms_decimal(fields[4]), dms_decimal(fields[5])],
        magnitude: Number(fields[6]),
        velocity: [Number(fields[7]), Number(fields[8])],
        offset: Number(fields[9]),
        positional_error: positionalError.every(isNaN) ? undefined : positionalError,
        pixel_location: isNEAT ? [Number(fields[13]), Number(fields[14])] : undefined
      };
      observations.push(observation);
    }

    cb({error: null, observations: observations});
  });
}

/*
 * GET Observations of SkyMorph moving targets
 */
exports.by_target = function (req, res) {
  getObservations(req.query.target, req.query, req.query.service, function (result) {
    res.jsonp(result);
  });
};

