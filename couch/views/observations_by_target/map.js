function(doc) {
  if (doc.type == 'observation') 
    // key by orbital parameters
    emit(doc.target.toLowerCase(), doc.observation);
}
