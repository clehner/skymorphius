function(doc) {
  if (doc.type == 'observation') 
    // key by orbital parameters
    emit(doc.target, doc.observation);
}
