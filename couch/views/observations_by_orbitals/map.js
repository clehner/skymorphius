function(doc) {
  if (doc.type == 'observation') {
    // key by orbital parameters
    var q = doc.params;
    var key = [
      q.epoch, q.eccentricity, params.per_dist, params.per_date,
      q.long_asc_node, q.arg_of_per, params.inclination,
      q.h_magnitude, q.service
    ];
    emit(key, doc.observation);
  }
}
