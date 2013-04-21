// Utilities
function parseQuery(str) {
  var obj = {};
  str.split('&').forEach(function (pair) {
    var keyval = pair.split('=', 2);
    obj[keyval[0]] = keyval[1];
  });
  return obj;
}

function makeQuery(obj) {
  var keyvals = [];
  for (var key in obj)
    keyvals.push(key + '=' + obj[key]);
  return keyvals.join('&');
}

function searchByTarget(target) {
  console.log('target: '+target);
}

function searchByOrbitals(params) {
  console.log('params:', params);
}

function $(id) { return document.getElementById(id); }
var searchContainer = $("observations-search");
var advancedSearchForm = $("advanced-search");
var simpleSearchForm = $("simple-search");
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

// sync up hash change with search fields
var hashArgs = {};
function onHashChange() {
  hashArgs = parseQuery(location.hash.substr(1));
  for (var el in hashArgs)
    if (inputs.hasOwnProperty(el))
      inputs[el].value = hashArgs[el];
}
// write the hash object to the location
function updateHash() {
  location.hash = '#' + makeQuery(hashArgs);
}
window.addEventListener("hashchange", onHashChange, false);

function onSimpleSubmit(e) {
  if (e) e.preventDefault();
  var target = inputs.target.value;
  if (target) searchByTarget(target);
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
  searchByOrbitals(values);
}
advancedSearchForm.addEventListener("submit", onAdvancedSubmit, false);

// load initial search
onHashChange();
if (hashArgs.target) onSimpleSubmit();
else if (hashArgs.epoch) onAdvancedSubmit();

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

["simple", "advanced"].map(function (tabName) {
  $(tabName+"-link").addEventListener("click", function (e) {
    e.preventDefault();
    setActiveTab(tabName+"-search");
  }, false);
});
