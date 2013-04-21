function(doc) {
  if (doc.type == 'observation') 
    // key by orbital parameters
    var params = doc.params;
    var key = [
      params.epoch, params.eccentricity, params.per_dist, params.per_date,
      params.long_asc_node, params.arg_of_per, params.inclination,
      params.h_magnitude, params.service
    ];
    emit(key, doc.observation);
}
