// Utilities
function parseQuery(str) {
  var obj = {};
  if (str) str.split('&').forEach(function (pair) {
    var keyval = pair.split('=', 2);
    var key = decodeURIComponent(keyval[0]);
    var val = decodeURIComponent(keyval[1]);
    obj[key] = val;
  });
  return obj;
}

function makeQuery(obj) {
  var keyvals = [];
  for (var key in obj)
    keyvals.push(key + '=' + encodeURIComponent(obj[key]));
  return keyvals.join('&');
}

function ajax(url, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      cb(xhr);
      xhr = null;
    }
  };
  xhr.send(null);
}

// DOM references
function $(id) { return document.getElementById(id); }
var searchContainer = $("observations-search");
var advancedSearchForm = $("advanced-search");
var simpleSearchForm = $("simple-search");
var errorEl = $("error");
var observationsEl = $("observations");
var inputs = {
  target: $("target"),
  epoch: $("epoch"),
  eccentricity: $("eccentricity"),
  per_distance: $("per_distance"),
  per_date: $("per_date"),
  long_asc_node: $("long_asc_node"),
  arg_of_per: $("arg_of_per"),
  inclination: $("inclination"),
  h_magnitude: $("h_magnitude")
};

// Rendering observations (search results)

function renderObservation(observation) {
  if (!observation.image) {
    // only show rows with images
    return;
  }
  var obsEl = document.createElement("li");

  var img = new Image();
  img.setAttribute("src", observation.image);
  img.alt = observation.time;
  obsEl.appendChild(img);

  //obsEl.textContent = JSON.stringify(observation);
  observationsEl.appendChild(obsEl);
}

function renderObservations(observations) {
  observationsEl.innerHTML = "";
  if (observations.length) {
    observations.forEach(renderObservation);
  } else {
    observationsEl.innerHTML = "No results";
  }
}

function showError(error) {
  errorEl.textContent = JSON.stringify(error);
}

// Searches

function searchObservations(params) {
  // show loader
  searchContainer.className = "loading";
  params.service = 'NEAT';
  ajax('./observations?' + makeQuery(params), function (xhr) {
    var resp, error;
    try {
      resp = JSON.parse(xhr.responseText);
      error = resp.error;
    } catch(e) {
      error = 'JSON error';
    }
    if (error) showError(error);
    else renderObservations(resp.observations);
    // hide loader
    searchContainer.className = "";
  });
}

// Setup

// sync up hash change with search fields
var hashArgs = {};
function onHashChange() {
  hashArgs = parseQuery(location.hash.substr(1));
  for (var el in hashArgs)
    if (inputs.hasOwnProperty(el))
      inputs[el].value = hashArgs[el];
  if (hashArgs.epoch) onAdvancedSubmit();
  else if (hashArgs.target) onSimpleSubmit();
}
// write the hash object to the location
function updateHash() {
  location.hash = '#' + makeQuery(hashArgs);
}
window.addEventListener("hashchange", onHashChange, false);

function onSimpleSubmit(e) {
  if (e) e.preventDefault();
  var target = inputs.target.value;
  if (target) searchObservations({target: target});
  hashArgs.target = target;
  updateHash();
}
simpleSearchForm.addEventListener("submit", onSimpleSubmit, false);

function onAdvancedSubmit(e) {
  if (e) e.preventDefault();
  var values = {};
  for (var el in inputs) {
    var value = inputs[el].value;
    hashArgs[el] = value;
    if (value) values[el] = value;
  }
  updateHash();
  searchObservations(values);
}
advancedSearchForm.addEventListener("submit", onAdvancedSubmit, false);

// load initial search
onHashChange();

// tab movement

var tabContainer = searchContainer;
function setActiveTab(tabName) {
  var tab = $(tabName);
  // make the tab become :first-child. muhahaha...
  if (tab) tabContainer.insertBefore(tab, tabContainer.firstChild);
  // save for later
  if (sessionStorage) sessionStorage.skyMorphiusTab = tabName;
}
// recover last active tab
if (sessionStorage) setActiveTab(sessionStorage.skyMorphiusTab);

// tab links
["simple", "advanced"].map(function (tabName) {
  $(tabName+"-link").addEventListener("click", function (e) {
    e.preventDefault();
    setActiveTab(tabName+"-search");
  }, false);
});
