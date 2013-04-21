var request = require('request');
var fs = require('fs');

var couchConfig = require('./couchconfig');
var couchURL = couchConfig.url;

var skyViewURL = 'http://skyview.gsfc.nasa.gov';
var skyMorphImagesURL = skyViewURL + '/cgi-bin/skymorph/mobsdisp.pl';
var skyMorphObservationsURL = skyViewURL + '/cgi-bin/skymorph/mobssel.pl';

var imageSize = 500;
var headers = '|Observation|Time|ObjRA|ObjDec|Plt RA|Plt Dec|Magnitude|V_RA|V_Dec|E_Maj|E_Min|E_PosAng|';
var headersNEAT = headers + 'x|y|';

var obsRegex = /<tr>\s*(?:<td.*?Check_[^ ]* value='([^']*)'>\s*)?([\s\S]*?)<\/tr>/g;
var obsRegexInner = /([^<>]+)(?=<\/td)/g;
var nbspRegex = /&nbsp;/g;
var imagesRegex = /<img src='?(?:http:\/\/[^\/]*)?(.*?\/tempspace\/images.*?)'?[ >]/g;
var badDateRegex = /([0-9]*):60$/;

function badDateReplace(m) { return (+m[1]+1) + ':00'; }

// by doc id
var imagesPending = {};

function onImageLoad(id, cb) {
  if (imagesPending[id]) {
    // respond when the image has loaded (or not)
    imagesPending[id].push(cb);
  } else {
    cb();
  }
}


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

// convert an object into a queury object usable for CouchDB requests
function JSONQuery(obj) {
  var q = {};
  for (var k in obj)
    q[k] = JSON.stringify(obj[k]);
  return q;
}

// Get an image from SkyMorph and save it CouchDB
// Background request
function fetchImage(service, docId, rev, imageId) {
  imagesPending[docId] = [];
  console.log('Fetching image', imageId, 'for', docId);
  getImageInfo(service, imageId, function (result) {
    if (result.error) {
      console.error('Error fetching image', result.error, service, docId,
        rev, imageId);
      return;
    }
    var imageURL = result.urls[0];
    if (!imageURL) {
      console.error('Failed to fetch image URL for',
        service, docId, rev, imageId);
    } else {
      saveImage(docId, rev, imageURL, function (success) {
        var cbs = imagesPending[docId];
        delete imagesPending[docId];
        cbs.forEach(function (cb) {
          cb(success);
        });
      });
    }
  });
}

// Download an image url and save it as an attachment to the observation doc
function saveImage(docId, rev, imageURL, cb) {
  request.get(imageURL).pipe(request.put({
    url: couchURL + '/' + encodeURIComponent(docId) + '/image',
    qs: {rev: rev},
    json: true
  }, function (error, resp, body) {
    if (body.error == 'conflict') {
      console.log('Conflict', docId, rev, imageId);
      // get the new rev
      getDocRev(docId, function (newRev) {
        if (rev) {
          saveImage(docId, newRev, imageURL, cb);
        } else {
          console.error('Unable to get rev for', docId);
          cb(false);
        }
      });
    } else if (error || body.error) {
      console.error('Error saving image', error||body.error, docId, rev, imageURL);
      return;
    } else {
      console.log('Saved image', docId, imageURL);
      cb(true);
    }
  }));
}

// get a document revision from couch
function getDocRev(docId, cb) {
  request.head(couchURL + '/' + encodeURIComponent(docId),
    function (err, resp) {
      var etag = resp.headers.etag;
      // the etag should be the rev
      cb(etag);
    }
  );
}

// get image info from SkyMorph
function getImageInfo(service, imageId, cb) {
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
  // todo: figue out how to have multiple image ids each with the same key
  query['Check_'+service] = imageId;

  request.post({
    uri: skyMorphImagesURL,
    qs: query
  }, function (err, resp, body) {
    body = body.toString('ascii');
    if (err) {
      cb({error: err, urls: []});
      return;
    }
    var urls = [], match;
    while ((match = imagesRegex.exec(body))) {
      var path = match[1];
      var url = skyViewURL + path;
      console.log('got url', url);
      urls.push(url);
    }
    cb({error: false, urls: urls});
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
    // it's not very relaxed, but it works for exact matching of parameters
    var key = [
      params.epoch, params.eccentricity, params.per_dist, params.per_date,
      params.long_asc_node, params.arg_of_per, params.inclination,
      params.h_magnitude, params.service
    ];
    query = {
      startkey: key,
      endkey: key.concat({})
    };
  }
  query.reduce = false;
  request({
    uri: couchURL + '/_design/skymorphius/_view/' + view,
    qs: JSONQuery(query),
    json: true
  }, function (err, resp, body) {
    //console.log('got couch observations', body);
    if (err || body.error) {
      return cb({
        error: err || body,
        found: false,
        observations: []
      });
    }

    var rows = body.rows;
    var observations = rows.map(function (row) {
      var obj = row.value;
      if (obj) {
        obj.image = '/observations/' + row.id + '/image';
      }
      return obj;
    });

    // falsy first observation value indicates no observations for these params
    var none = rows.length && !observations.some(Boolean);

    cb({
      error: null,
      found: rows.length > 0 && !none,
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

  console.log('Getting SkyMorph observations');

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
    uri: skyMorphObservationsURL,
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
        id: obsId,
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
      var obs2 = cloneObject(obs);
      obs2.type = 'observation';
      if (target) obs2.names = [target];
      // background tasks will get post the image to the doc later
      delete obs2.image;
      delete obs2.imageId;
      var doc = {
        _id: obs.id,
        type: 'observation',
        observation: obs2
      };
      if (target) doc.target = target;
      else doc.params = params;
      return doc;
    });
    if (!observations.length) {
      // mark that there are no observations for these parameters
      // _id will be randomly generated
      var doc = {
        type: 'observation',
        observation: null
      };
      if (target) doc.target = target;
      else doc.params = params;
      docs = [doc];
    }

    request.post({
      url: couchURL + '/_bulk_docs',
      json: {docs: docs}
    }, function (err, resp, results) {
      if (err) {
        console.error("Couch error:", err || body);
        return;
      }
      // get the status of each document save
      results.forEach(function (docResp, i) {
        var id = docResp.id;
        var obs = observations[i];
        if (!obs) {
          console.log('Unable to find observation for doc', id, target||params,
            {observations: observations, results: results});
          return;
        }
        var imageId = obs.imageId;
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
                fetchImage(service, id, rev, imageId);
              }
            });
          }
        } else {
          // retrieve images in the background
          if (imageId) {
            fetchImage(service, id, docResp.rev, imageId);
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
  // proxy to doc in couch
  request.get(couchURL + '/' + encodeURIComponent(id)).pipe(res);
};

/*
 * GET observation data or image
 */
exports.image_by_id = function fn(req, res) {
  var id = req.params.id;
  onImageLoad(id, function () {
    request.get(couchURL + '/' + encodeURIComponent(id) + '/image').pipe(res);
  });
};

