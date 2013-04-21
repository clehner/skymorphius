function(doc) {
  if (doc.type == 'observation') {
    // key by orbital parameters
    var q = doc.params;
    var key = [
      q.epoch, q.eccentricity, q.per_dist, q.per_date,
      q.long_asc_node, q.arg_of_per, q.inclination,
      q.h_magnitude, q.service
    ];
    emit(key, doc.observation);
  }
}
