function (doc, oldDoc, userCtx) {
  if (userCtx.name != 'skymorphius' &&
      userCtx.roles.indexOf('skymorphius') == -1 &&
      userCtx.roles.indexOf('_admin') == -1) {
    throw {unauthorized: 'Not permitted'};
  }

  if (doc._deleted) {
    return;
  }

  if (doc.type == 'observation' || doc.type == 'no_observations') {
    if (!doc.params && !doc.target)
      throw {unauthorized: 'missing orbital params or target name'};

    if (doc.type == 'observation') {
      if (!doc.observation) throw {unauthorized: 'missing observation object'};
    }
  } else {
    throw {forbidden: 'Invalid doc type'};
  }
}
