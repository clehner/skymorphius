var request = require('request');
var fs = require('fs');

var couchConfig = require('./couchconfig');
var couchURL = couchConfig.url;

var imageSize = 500;
var headers = '|Observation|Time|ObjRA|ObjDec|Plt RA|Plt Dec|Magnitude|V_RA|V_Dec|E_Maj|E_Min|E_PosAng|';
var headersNEAT = headers + 'x|y|';

var obsRegex = /<tr>\s*(?:<td.*?Check_[^ ]* value='([^']*)'>\s*)?([\s\S]*?)<\/tr>/g;
var obsRegexInner = /([^<>]+)(?=<\/td)/g;
var nbspRegex = /&nbsp;/g;
var imagesRegex = /<img src='?(?:http:\/\/[^\/]*)?(.*?\/tempspace\/images.*?)'?[ >]/;
var badDateRegex = /([0-9]*):60$/;
function badDateReplace(m) { return (+m[1]+1) + ':00'; }

// convert a DMS string into a decimal number
function dms_decimal(dms) {
  var nums = dms.split(' ').map(Number),
    d = nums[0],
    m = nums[1],
    s = nums[2],
    sign = d > 0 ? 1 : d < 0 ? -1 : 0;
  return sign * (d*sign + m/60 + s/3600);
}

function cloneObject(obj) {
  var copy = {};
  for (var k in obj) {
    copy[k] = obj[k];
  }
  return copy;
}

// Get an image from SkyMorph and save it CouchDB
// Background request
function fetchImage(id, rev, imageId) {
  console.log('todo');
}

// get a document revision from couch
function getDocRev(docId, cb) {
  console.log('todo');
}

// get image info from SkyMorph
function getImageInfo(service, imageIds, cb) {
  var query = {
    Headers_NEAT: headersNEAT,
    Headers_DSS: headers,
    Headers_DSS2: headers,
    Headers_HST: headers,
    Headers_USNO: headers,
    Npixel: imageSize,
    NpixelD2: imageSize,
    Singlets: 'on',
    Scaling: 'Log',
    Extremum: 'Dft',
    OverSize: 300,
    OverScale: 0.5
  };
  query['Check_'+service] = imageIds;

  req.post({
    uri: "http://skyview.gsfc.nasa.gov/cgi-bin/skymorph/mobsdisp.pl",
    qs: query
  }, function (err, resp, body) {
    if (err) {
      cb({error: err});
      return;
    }
    var match;
    while ((match = imagesRegex.exec(body))) {
      var path = match[1];
      console.log(path);
    }
  });
}

function getObservationsCouch(target, params, service, cb) {
  var query, view;
  if (target) {
    view = 'observations_by_target';
    query = {
      key: target.toLowerCase()
    };
  } else {
    view = 'observations_by_orbitals';
    // it's not very couchdby, but it works for exact matching of parameters
    var key = [
      params.service, params.time,
      params.predicted_position, params.observation_center,
      params.h_magnitude, params.velocity, params.offset,
      params.positional_error, params.pixel_location
    ];
    query = {
      startkey: key,
      endkey: key.concat({})
    };
  }
  request({
    uri: couchURL + '/_design/skymorphius/_view/' + view,
    qs: query,
    json: true
  }, function (err, resp, body) {
    if (err || body.error) {
      return cb({
        error: err || body.error,
        found: false,
        observations: []
      });
    }

    var observations = body.rows.map(function (row) {
      return row.value;
    });

    // falsy first observation value indicates no observations for these params
    var none = (body.total_rows == 1) && !observations[0];

    cb({
      error: null,
      found: body.total_rows > 0 && !none,
      observations: observations
    });
  });
}

// Scrape the SkyMorph site for observations by target or orbital elements
function getObservationsNASA(target, params, service, cb) {
  if (!service) {
    cb({error: 'service is required'});
    return;
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

  request({
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
    while ((match = obsRegex.exec(body))) {
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
        fields[1] = fields[1].replace(badDateRegex, badDateReplace);
      }

      // ignore nonmatching rows
      if (!fields || !fields[1] || isNaN(new Date(fields[1]))) {
        continue;
      }

      var obsId = fields[0];
      var positionalError = fields.slice(10, 13).map(Number);

      var observation = {
        service: service,
        image: imageId ? "/observations/" + obsId + "/image" : undefined,
        imageId: imageId,
        _id: obsId,
        has_triplet: hasTriplet,
        time: fields[1],
        predicted_position: [dms_decimal(fields[2]), dms_decimal(fields[3])],
        observation_center: [dms_decimal(fields[4]), dms_decimal(fields[5])],
        h_magnitude: Number(fields[6]),
        velocity: [Number(fields[7]), Number(fields[8])],
        offset: Number(fields[9]),
        positional_error: positionalError.every(isNaN) ?
          undefined : positionalError,
        pixel_location: isNEAT ?
          [Number(fields[13]), Number(fields[14])] : undefined
      };
      observations.push(observation);
    }

    cb({error: null, observations: observations});

    // save this data to couch
    var docs = observations.map(function (obs) {
      var obj = cloneObject(obj);
      obj.type = 'observation';
      if (target) obj.names = [target];
      delete obj.image;
      return obj;
    });
    request.put({
      url: couchURL,
      json: {docs: docs}
    }, function (err, resp, body) {
      if (err) {
        console.error("Couch error: "+err);
        return;
      }
      // get the status of each document save
      body.docs.forEach(function (docResp, i) {
        var id = docResp.id;
        var imageId = observations[i].imageId;
        if (docResp.error == 'conflict') {
          // this probably means the data is already in the db
          console.warn('Couch save conflict', id, docResp.reason);
          if (imageId) {
            // still need to get the image.
            // get the doc rev and then save the image
            getDocRev(id, function (rev) {
              if (!rev) {
                console.error('Unable to get document rev!');
              } else {
                fetchImage(id, rev, imageId);
              }
            });
          }
        } else {
          // retrieve images in the background
          if (imageId) {
            fetchImage(id, docResp.rev, imageId);
          }
        }
      });
    });
  });
}

/*
 * GET observations of SkyMorph moving targets
 * by target or orbital elements
 */
exports.index = function (req, res) {
  var query = req.query,
    target = query.target,
    service = query.service;
  // try couchdb first, and fall back to NASA
  getObservationsCouch(target, query, service, function (result) {
    if (result.error) {
      console.error('Error getting observations from couch.', result.error);
    }
    if (result.found) {
      // may contain no observations
      res.jsonp(result);
    } else {
      // fetch results from NASA
      getObservationsNASA(target, query, service, function (result) {
        if (result.error) {
          console.error('Error getting observations from couch.', result.error);
        }
        res.jsonp(result);
      });
    }
  });
};

/*
 * GET an observation datum
 */
exports.by_id = function (req, res) {
  var id = req.params.id;
};

/*
 * GET observation data or image
 */
exports.image_by_id = function (req, res) {
  var id = req.params.id;
};

