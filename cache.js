/* the core cache and implicit conversion interface functionality of the bot 
 * wraps around function for converting between various musical formats
 * and caching record of the results and whatnot */

// TODO: use actual javascript exceptions for error callbacks
// TODO: use promises in place of callbacks?
// TODO: database based cache storage? instead of storing the cached files and the cache data structure on disk

const fs = require('fs');
const cachePath = 'cache.json';

// this is a graph of target formats and ways things can be converted
const conversionGraph = require('./conversion')

// for satisfying functions that expect callbacks
function noop() {}

// find possible conversion paths from source format to target format
function findPaths(source, target, ignore=[]) {
	let conversions = conversionGraph[source];
	let targets = Object.keys(conversions).filter(t => ignore.indexOf(t) == -1);
	let paths = targets.map(t => {
		const next = t === target ? [] : findPaths(t, target, ignore.concat([source]));
		const node = {
			target: t,
			convert: conversions[t],
			next: next,
		};
		return node;
	}).filter(node => node.target === target || node.next.length);
	return paths;
}

// TODO: maybe merge this and the above function? ?
function findPathsFromSources(sources, target) {
	return sources.map(source => {
		return {
			target: source,
			next: findPaths(source, target),
		};
	})
}

// a convertable entity
// cache is the cached data for each target file format in the graph above
// when a format is requested, if its not in the cache, itll be chain converted
// TODO: make this 'get' work using js proxy objects???
class Convertable {
	constructor(cache={}) {
		this.cache = cache;
	}

	chainConvert(node, callback) {
		//TODO: pick the most suitable path here instead of first
		const source = this.cache[node.target];
		if(node.next.length) {
			const next = node.next[0];
			next.convert(source, result => {
				this.cache[next.target] = result;
				this.chainConvert(next, callback);
			});
		} else callback && callback(source);
	}

	convert(target, callback, onError) {
		//TODO: pick the most suitable starting source instead of just first
		const paths = findPathsFromSources(Object.keys(this.cache), target);
		const node = paths[0];
		if(node.next.length) this.chainConvert(node, callback)
		else onError('No conversion path!');
	}

	get(target, callback, onConvert, onError) {
		if(target in this.cache) callback && callback(this.cache[target]);
		else this.convert(target, result => {
			callback(result);
			onConvert(result);
		}, onError);
	}
}

// global cache stuff
// TODO: explore better persistance options?
// using synchronous here because we don't want to continue the program until we've loaded the cache, otherwise we risk a small possibility of the cache file being overwritten with empty data if it's not loaded before a change is made
// also should i be using require on this? :p
function load() {
	const cache = require(`./${cachePath}`);
	Object.keys(cache).forEach(key => cache[key] = new Convertable(cache[key].cache));
	return cache;
}

// store the cache to disk
function store() {
	fs.writeFile(cachePath, JSON.stringify(cache), 'utf8', noop);
}

// access the cache
// storing the cache to disk if any conversions took place
// use key most likely for each discord channel
function get(key, target, callback, onError) {
	if(key in cache) cache[key].get(target, callback, store, onError);
	else onError && onError('Key not in cache!');
}

// put a new convertable object into the cache given an initial target object
// invalidates the cache for this key
function put(key, target, object) {
	const initCache = {};
	initCache[target] = object;
	cache[key] = new Convertable(initCache);
	store();
}

// init the global cache, loading from file if exists
const cache = fs.existsSync(cachePath) ? load() : {};

// export the get and put functions
module.exports = {
	get: get,
	put: put,
}
