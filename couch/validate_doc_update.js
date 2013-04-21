function (doc, oldDoc, userCtx) {
  if (userCtx.name != 'skymorphius' &&
      userCtx.roles.indexOf('skymorphius') == -1 &&
      userCtx.roles.indexOf('_admin') == -1) {
    throw {unauthorized: 'Not permitted'};
  }

  if (doc._deleted) {
    return;
  }

  if (doc.type == 'observation') {
    // doc.observation can be an observation object or null meaning no
    // observations for these params/target
    if (!doc.params && !doc.target)
      throw {unauthorized: 'missing orbital params or target name'};
  } else {
    throw {forbidden: 'Invalid doc type'};
  }
}
